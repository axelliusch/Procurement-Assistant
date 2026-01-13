
export interface ExtractedField {
  name: string;
  value: string;
  unit?: string;
  page_ref?: number | string;
}

export interface Ambiguity {
  text_snippet: string;
  reason: string;
  page_ref?: number | string;
}

export interface DraftMessage {
  subject: string;
  body: string;
}

export interface VendorCheckInputs {
  website?: string;
  registered_name?: string;
  linkedin?: string;
}

export interface VendorCredibilityItem {
  found: boolean;
  value?: string; // Actual data value (URL, phone number, address string)
  notes: string;
}

export interface VendorCredibilityAnalysis {
  website: VendorCredibilityItem;
  linkedin: VendorCredibilityItem;
  phone: VendorCredibilityItem; // Added phone
  address: VendorCredibilityItem;
  social_presence: VendorCredibilityItem;
  risk_indicator: 'Low' | 'Medium' | 'High';
  limitations: string[];
}

export interface VendorIdentification {
  vendor_name: string;
  confidence_level: 'High' | 'Medium' | 'Low';
  evidence: { text_snippet: string; page_ref: number | string }[];
}

export interface ScoringCategory {
  category: string;
  score: number; // 0-100
  weight: number; // 0.0-1.0
  reasoning: string;
}

export interface AnalysisResult {
  summary: string;
  extracted_fields: ExtractedField[];
  gaps: string[];
  ambiguities: Ambiguity[];
  draft_email: DraftMessage;
  draft_rfq: DraftMessage;
  score: number;
  scoring_breakdown?: ScoringCategory[]; // New field for detailed visualization
  score_explanation: string[];
  vendor_check_inputs: VendorCheckInputs;
  vendor_credibility_summary?: string | VendorCredibilityAnalysis;
  vendor_identification?: VendorIdentification;
  history_log?: string;
}

export interface UploaderInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  vendorName: string;
  score: number;
  data: AnalysisResult;
  ownerId: string; // User ID of the owner
  uploader?: UploaderInfo; // Details of who originally uploaded/scanned this
  isPublished?: boolean; // If true, it exists in Collective (used for UI states)
}

export interface Note {
  id: string;
  title: string;
  content: string;
  labels: string[];
  linkedProposalId?: string;
  createdAt: number;
  lastUpdatedAt: number;
  ownerId: string;
}

export type UserRole = 'admin' | 'analyst';

export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string; // In a real app, never store plain text. Used here for simulation.
  role: UserRole;
}

export interface Colleague {
  userId: string;
  username: string;
  addedAt: number;
}

export interface AppSettings {
  aiModel: string;
  globalRole: string;
  scoringWeights: string;
  promptSummary: string;
  promptGaps: string;
  promptAmbiguities: string;
  promptEmail: string;
  promptRfq: string;
  promptCredibility: string;
  promptHistory: string;
}