
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";
import { getSettings } from "./settingsService";

const JSON_STRUCTURE_INSTRUCTION = `
You must strictly output ONLY valid JSON.
Required top-level keys:
- summary: (string) matches Executive Summary instructions.
- extracted_fields: array of objects { name, value, unit, page_ref }.
- gaps: array of strings matches Gap Analysis instructions.
- ambiguities: array of objects {text_snippet, reason, page_ref}.
- draft_email: {subject, body}.
- draft_rfq: {subject, body}.
- score: integer 0-100 (The weighted total).
- scoring_breakdown: array of objects { category, score, weight, reasoning }.
- score_explanation: array of strings (Summary of the scoring logic).
- vendor_check_inputs: { website, registered_name, linkedin }.
- vendor_identification: object { vendor_name, confidence_level, evidence }.
- vendor_credibility_summary: object matches Vendor Credibility instructions.
- history_log: (string) matches History Log instructions.

If you cannot find a required field, include it in gaps. Always include page_ref where data was found.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    extracted_fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          page_ref: { type: Type.STRING },
        },
        required: ["name", "value", "page_ref"]
      },
    },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
    ambiguities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text_snippet: { type: Type.STRING },
          reason: { type: Type.STRING },
          page_ref: { type: Type.STRING },
        },
        required: ["text_snippet", "reason"]
      },
    },
    draft_email: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        body: { type: Type.STRING },
      },
      required: ["subject", "body"]
    },
    draft_rfq: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        body: { type: Type.STRING },
      },
      required: ["subject", "body"]
    },
    score: { type: Type.NUMBER },
    scoring_breakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          score: { type: Type.INTEGER },
          weight: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["category", "score", "weight", "reasoning"]
      }
    },
    score_explanation: { type: Type.ARRAY, items: { type: Type.STRING } },
    vendor_check_inputs: {
      type: Type.OBJECT,
      properties: {
        website: { type: Type.STRING },
        registered_name: { type: Type.STRING },
        linkedin: { type: Type.STRING },
      },
      required: ["registered_name"]
    },
    vendor_identification: {
      type: Type.OBJECT,
      properties: {
        vendor_name: { type: Type.STRING },
        confidence_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        evidence: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text_snippet: { type: Type.STRING },
              page_ref: { type: Type.STRING },
            },
            required: ["text_snippet", "page_ref"]
          }
        }
      },
      required: ["vendor_name", "confidence_level", "evidence"]
    },
    vendor_credibility_summary: {
      type: Type.OBJECT,
      properties: {
        website: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            value: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["found", "notes"]
        },
        linkedin: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            value: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["found", "notes"]
        },
        phone: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            value: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["found", "notes"]
        },
        address: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            value: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["found", "notes"]
        },
        social_presence: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            notes: { type: Type.STRING }
          },
          required: ["found", "notes"]
        },
        risk_indicator: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
        limitations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["website", "linkedin", "phone", "address", "risk_indicator", "limitations"]
    },
    history_log: { type: Type.STRING },
  },
  required: [
    "summary",
    "extracted_fields",
    "gaps",
    "ambiguities",
    "draft_email",
    "draft_rfq",
    "score",
    "scoring_breakdown",
    "score_explanation",
    "vendor_check_inputs",
    "vendor_identification",
    "vendor_credibility_summary",
    "history_log"
  ],
};

export const analyzeProposal = async (
  fileBase64: string,
  mimeType: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("Configuration Error: API Key is missing. Please contact the administrator.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const settings = getSettings();
  
  // Use the model from settings, default to flash if not set
  const modelName = settings.aiModel || "gemini-3-flash-preview";

  const dynamicSystemInstruction = `
${JSON_STRUCTURE_INSTRUCTION}

${settings.globalRole}

${settings.scoringWeights}

--- FIELD SPECIFIC INSTRUCTIONS ---

STEP 1: VENDOR IDENTIFICATION
TASK: Identify the supplier or vendor from the uploaded proposal document.
INSTRUCTIONS:
- Extract the most likely company name
- Look for logos, headers, footers, legal entity names, or contact sections
- If multiple company names appear, choose the primary issuer of the proposal
- If the vendor cannot be confidently identified, state "Unclear"

STEP 2: CREDIBILITY CHECK (USE GOOGLE SEARCH)
TASK: Analyze the document AND use Google Search tools to verify vendor credibility.
INSTRUCTIONS:
- Search for the Vendor Name online.
- WEBSITE: Find their official website URL.
- LINKEDIN: Find their LinkedIn company page.
- PHONE: Find a phone number (search internet if not in doc).
- ADDRESS: Verify the address found in the document using Google.
- If Google Search is used, you MUST ALWAYS extract the URLs from groundingChunks and list them in the 'notes' or 'value' fields of the JSON.

SCORING BREAKDOWN:
Based on the "scoringWeights" provided in the settings, you must populate the "scoring_breakdown" array.
For EACH category defined in the global weights (Price, Technical, Delivery, Warranty, Credibility):
1. Assign a raw score (0-100) based on the document content.
2. Include the weight used (e.g. 0.3 for 30%).
3. Provide a short reasoning string.
The top level "score" must be the calculated weighted average of these items.

EXECUTIVE SUMMARY:
${settings.promptSummary}

GAPS ANALYSIS:
${settings.promptGaps}

AMBIGUITIES:
${settings.promptAmbiguities}

EMAIL DRAFT:
${settings.promptEmail}

RFQ DRAFT:
${settings.promptRfq}

VENDOR CREDIBILITY CHECK:
${settings.promptCredibility}

HISTORY LOG / AUDIT:
${settings.promptHistory}
`;

  const prompt = `
    Analyze the uploaded supplier proposal document.
    1. Identify the vendor.
    2. Perform Credibility Check using Google Search (Find website, linkedin, phone, verify address).
    3. Perform the standard procurement analysis (gaps, scoring, drafts).
    Ensure strict adherence to the JSON schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        tools: [{ googleSearch: {} }], // Enabled Google Search for Credibility Check
        systemInstruction: dynamicSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!response.text) {
       // Check for stop reasons if text is empty (e.g. safety blocks)
       if (response.candidates && response.candidates.length > 0) {
           const reason = response.candidates[0].finishReason;
           if (reason === 'SAFETY') {
               throw new Error("Analysis Blocked: The document contains content flagged by safety filters (e.g., sensitive info, hate speech, or harassment).");
           } else if (reason === 'RECITATION') {
               throw new Error("Analysis Stopped: The model output was flagged for recitation of copyrighted material.");
           } else if (reason !== 'STOP') {
                throw new Error(`Analysis Stopped unexpectedly. Reason: ${reason}`);
           }
       }
       throw new Error("Empty Response: The AI returned no text. This usually means the document text could not be extracted or the file is empty.");
    }

    // Clean Markdown if present (sometimes models wrap JSON in markdown blocks despite instructions)
    let jsonString = response.text.trim();
    jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    try {
        return JSON.parse(jsonString) as AnalysisResult;
    } catch (parseError) {
        console.error("JSON Parse Error:", jsonString);
        throw new Error("Data Parsing Error: The AI analysis completed, but the output format was invalid. This often happens with very long or complex documents that cause the AI to cut off the response mid-stream. Please try uploading a smaller section or a simpler document.");
    }

  } catch (error: any) {
    console.error("Analysis failed:", error);
    
    // Enrich error messages for the user
    let userMessage = error.message || "An unexpected error occurred.";
    const errStr = userMessage.toLowerCase();

    if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("exhausted")) {
        userMessage = "Traffic Limit Exceeded: The system is currently busy. Please wait 30 seconds before retrying.";
    } else if (errStr.includes("503") || errStr.includes("unavailable")) {
        userMessage = "Service Unavailable: The AI service is temporarily down. Please check your internet connection and try again later.";
    } else if (errStr.includes("fetch failed") || errStr.includes("network")) {
        userMessage = "Network Error: Could not connect to the AI service. Please check your internet connection.";
    } else if (errStr.includes("api key")) {
        userMessage = "Configuration Error: Invalid API Key. Please contact your administrator.";
    } else if (errStr.includes("400")) {
        userMessage = "Bad Request: The file might be corrupted, unsupported, or too large. Please ensure it is a valid PDF or Image file.";
    }

    throw new Error(userMessage);
  }
};

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(new Error("File Reading Error: Could not read the file. It may be corrupted or permissions are denied."));
  });
};
