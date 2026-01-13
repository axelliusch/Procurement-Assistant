
import React, { useState } from 'react';
import { AnalysisResult, VendorCredibilityAnalysis } from '../types';
import { AlertTriangle, CheckCircle, Copy, FileText, Mail, ShieldAlert, Star, ExternalLink, ClipboardCheck, Search, ShieldCheck, MapPin, Linkedin, Info, PenTool, Save, Phone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AnalysisViewProps {
  data: AnalysisResult;
  onSave?: () => void;
  isSaved?: boolean;
  onSaveNote?: (title: string, content: string) => boolean; // Updated return type
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onSave, isSaved, onSaveNote }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'emails'>('overview');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedRfq, setCopiedRfq] = useState(false);

  // Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSavedStatus, setNoteSavedStatus] = useState('');

  // Helper to determine if we have structured credibility data
  const hasStructuredCredibility = typeof data.vendor_credibility_summary === 'object' && data.vendor_credibility_summary !== null;
  const credibilityData = hasStructuredCredibility ? (data.vendor_credibility_summary as VendorCredibilityAnalysis) : null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const getRiskColor = (risk: string) => {
      switch (risk?.toLowerCase()) {
          case 'low': return 'text-green-600 bg-green-50 border-green-200';
          case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
          case 'high': return 'text-red-600 bg-red-50 border-red-200';
          default: return 'text-slate-600 bg-slate-50 border-slate-200';
      }
  };

  const chartData = [
    { name: 'Score', value: data.score, fill: getScoreColor(data.score) },
    { name: 'Max', value: 100, fill: '#e2e8f0' }
  ];

  const handleCopyEmail = () => {
    const text = `Subject: ${data.draft_email.subject}\n\n${data.draft_email.body}`;
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyRfq = () => {
    const text = `Subject: ${data.draft_rfq.subject}\n\n${data.draft_rfq.body}`;
    navigator.clipboard.writeText(text);
    setCopiedRfq(true);
    setTimeout(() => setCopiedRfq(false), 2000);
  };

  const handleSaveLocalNote = () => {
      if (onSaveNote && noteContent.trim()) {
          const success = onSaveNote(noteTitle, noteContent);
          if (success) {
            setNoteSavedStatus('Memo Saved!');
            // Optional: Clear fields or keep them
          } else {
            setNoteSavedStatus('Memo Exists!');
          }
          setTimeout(() => setNoteSavedStatus(''), 3000);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analysis Result</h2>
          <div className="flex items-center space-x-2 mt-1">
             <span className="text-slate-500">Vendor:</span>
             <span className="font-semibold text-slate-700 text-lg">
                 {data.vendor_identification?.vendor_name || data.vendor_check_inputs.registered_name || 'Unknown Vendor'}
             </span>
             {data.vendor_identification && (
                 <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                     data.vendor_identification.confidence_level === 'High' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                 }`}>
                     ID Confidence: {data.vendor_identification.confidence_level}
                 </span>
             )}
          </div>
        </div>
        <div className="flex space-x-3">
            {onSave && (
                <button 
                onClick={onSave}
                disabled={isSaved}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${isSaved ? 'bg-green-100 text-green-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                >
                {isSaved ? <CheckCircle className="w-4 h-4"/> : <Copy className="w-4 h-4" />}
                <span>{isSaved ? 'Saved to History' : 'Save Analysis'}</span>
                </button>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Overview & Scoring
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'emails' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Draft Communications
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Summary & Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-slate-800">Executive Summary</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">{data.summary}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">Extracted Data</h3>
               </div>
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-6 py-3">Field</th>
                      <th className="px-6 py-3">Value</th>
                      <th className="px-6 py-3">Page Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.extracted_fields.map((field, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-700">{field.name}</td>
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs md:text-sm">
                          {field.value} {field.unit && <span className="text-slate-400 ml-1">{field.unit}</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-400">{field.page_ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>

            {data.gaps.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-100 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-red-800">Missing Requirements (Gaps)</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-red-700">
                  {data.gaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
             {data.ambiguities.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-amber-800">Ambiguities Detected</h3>
                </div>
                <div className="space-y-3">
                  {data.ambiguities.map((item, i) => (
                    <div key={i} className="bg-white/50 p-3 rounded border border-amber-200">
                      <p className="text-amber-900 font-medium">"{item.text_snippet}"</p>
                      <p className="text-amber-700 text-sm mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.history_log && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                 <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Audit Log</h3>
                 <p className="text-xs font-mono text-slate-600">{data.history_log}</p>
              </div>
            )}
          </div>

          {/* Right Column: Score, Vendor, & Quick Notes */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-slate-800">Evaluation Strategy</h3>
                </div>
                <span className={`text-2xl font-bold ${data.score >= 80 ? 'text-green-600' : data.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {data.score}/100
                </span>
              </div>
              
              {data.scoring_breakdown && data.scoring_breakdown.length > 0 ? (
                  <>
                     {/* FIX: Add explicit width/height and minWidth to fix Recharts width(-1) warning */}
                     <div style={{ width: '100%', height: 300, minWidth: 0 }} className="mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.scoring_breakdown}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis 
                                    dataKey="category" 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar 
                                    name="Vendor Score" 
                                    dataKey="score" 
                                    stroke="#2563eb" 
                                    strokeWidth={2}
                                    fill="#3b82f6" 
                                    fillOpacity={0.4} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="space-y-3">
                         {data.scoring_breakdown.map((item, idx) => (
                             <div key={idx} className="flex flex-col text-sm border-b border-slate-50 pb-2 last:border-0">
                                 <div className="flex justify-between font-medium text-slate-700">
                                     <span>{item.category}</span>
                                     <span>{item.score}/100</span>
                                 </div>
                                 <div className="flex justify-between items-center text-xs mt-0.5">
                                     <span className="text-slate-400">Weight: {(item.weight * 100).toFixed(0)}%</span>
                                     <span className="text-slate-500 truncate max-w-[150px]" title={item.reasoning}>{item.reasoning}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                  </>
              ) : (
                // Fallback for legacy data without breakdown
                <div className="flex items-center justify-center mb-6 relative">
                     <div style={{ width: '100%', height: 200, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <XAxis type="number" hide domain={[0, 100]} />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <span className="text-4xl font-bold text-slate-800">{data.score}/100</span>
                     </div>
                </div>
              )}

              {/* Legacy Explanations List (Always show if available) */}
              {(!data.scoring_breakdown || data.scoring_breakdown.length === 0) && (
                <div className="space-y-2 mt-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Analysis Notes</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                    {data.score_explanation.map((exp, i) => (
                        <li key={i} className="flex items-start">
                        <span className="mr-2 text-blue-400">•</span>
                        <span>{exp}</span>
                        </li>
                    ))}
                    </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" />
                  Vendor Credibility
              </h3>
              
              {hasStructuredCredibility && credibilityData ? (
                 <div className="space-y-4">
                     <div className="flex items-center justify-between mb-2">
                         <span className="text-sm font-medium text-slate-600">Risk Indicator</span>
                         <span className={`px-2 py-1 rounded text-xs font-bold border ${getRiskColor(credibilityData.risk_indicator)}`}>
                             {credibilityData.risk_indicator}
                         </span>
                     </div>

                     <div className="space-y-3">
                         <div className="p-3 bg-slate-50 rounded border border-slate-100">
                             <div className="flex items-center mb-1">
                                 <ExternalLink className={`w-4 h-4 mr-2 ${credibilityData.website.found ? 'text-green-500' : 'text-slate-400'}`} />
                                 <span className="text-sm font-semibold text-slate-700">Website</span>
                             </div>
                             {credibilityData.website.value && credibilityData.website.found && (
                                <a href={credibilityData.website.value.startsWith('http') ? credibilityData.website.value : `https://${credibilityData.website.value}`} 
                                   target="_blank" rel="noreferrer" 
                                   className="text-xs text-blue-600 ml-6 hover:underline block truncate mb-1"
                                >
                                    {credibilityData.website.value}
                                </a>
                             )}
                             <p className="text-xs text-slate-600 ml-6">{credibilityData.website.notes}</p>
                         </div>

                         <div className="p-3 bg-slate-50 rounded border border-slate-100">
                             <div className="flex items-center mb-1">
                                 <Linkedin className={`w-4 h-4 mr-2 ${credibilityData.linkedin.found ? 'text-blue-500' : 'text-slate-400'}`} />
                                 <span className="text-sm font-semibold text-slate-700">LinkedIn</span>
                             </div>
                             {credibilityData.linkedin.value && credibilityData.linkedin.found && (
                                <a href={credibilityData.linkedin.value} target="_blank" rel="noreferrer" className="text-xs text-blue-600 ml-6 hover:underline block truncate mb-1">
                                    View Profile
                                </a>
                             )}
                             <p className="text-xs text-slate-600 ml-6">{credibilityData.linkedin.notes}</p>
                         </div>

                         <div className="p-3 bg-slate-50 rounded border border-slate-100">
                             <div className="flex items-center mb-1">
                                 <Phone className={`w-4 h-4 mr-2 ${credibilityData.phone?.found ? 'text-purple-500' : 'text-slate-400'}`} />
                                 <span className="text-sm font-semibold text-slate-700">Phone</span>
                             </div>
                             {credibilityData.phone?.value && credibilityData.phone?.found && (
                                 <p className="text-xs text-slate-800 font-mono ml-6 mb-1 select-all">{credibilityData.phone.value}</p>
                             )}
                             <p className="text-xs text-slate-600 ml-6">{credibilityData.phone?.notes || 'Not checked'}</p>
                         </div>

                         <div className="p-3 bg-slate-50 rounded border border-slate-100">
                             <div className="flex items-center mb-1">
                                 <MapPin className={`w-4 h-4 mr-2 ${credibilityData.address.found ? 'text-red-500' : 'text-slate-400'}`} />
                                 <span className="text-sm font-semibold text-slate-700">Address</span>
                             </div>
                             {credibilityData.address.value && credibilityData.address.found && (
                                <p className="text-xs text-slate-800 ml-6 mb-1">{credibilityData.address.value}</p>
                             )}
                             <p className="text-xs text-slate-600 ml-6">{credibilityData.address.notes}</p>
                         </div>
                     </div>
                     
                     {credibilityData.limitations.length > 0 && (
                         <div className="mt-4 text-[10px] text-slate-400 italic">
                             <strong>Note:</strong> {credibilityData.limitations.join('. ')}
                         </div>
                     )}
                 </div>
              ) : (
                // Fallback for legacy string data
                <div className="space-y-4">
                    {data.vendor_credibility_summary && typeof data.vendor_credibility_summary === 'string' && (
                        <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 italic border border-slate-100 mb-4">
                            {data.vendor_credibility_summary}
                        </div>
                    )}
                    <div>
                        <span className="text-xs text-slate-400 uppercase">Website</span>
                        {data.vendor_check_inputs.website ? (
                            <a href={data.vendor_check_inputs.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline truncate">
                                {data.vendor_check_inputs.website} <ExternalLink className="w-3 h-3 ml-1"/>
                            </a>
                        ) : (
                            <span className="block text-slate-500 text-sm">Not found</span>
                        )}
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 uppercase">LinkedIn</span>
                        <p className="text-slate-700 truncate">{data.vendor_check_inputs.linkedin || 'Not specified'}</p>
                    </div>
                </div>
              )}
            </div>

            {/* Embedded Quick Memo Section */}
            {onSaveNote && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                          <PenTool className="w-5 h-5 text-indigo-500" />
                          <h3 className="text-lg font-semibold text-slate-800">Quick Memo</h3>
                      </div>
                      {noteSavedStatus && (
                          <span className={`text-xs font-medium animate-fade-in flex items-center ${noteSavedStatus.includes('Exists') ? 'text-amber-600' : 'text-green-600'}`}>
                              {noteSavedStatus.includes('Exists') ? <AlertTriangle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                              {noteSavedStatus}
                          </span>
                      )}
                  </div>
                  
                  <div className="space-y-3">
                      <div>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                              placeholder="Title..."
                              value={noteTitle}
                              onChange={(e) => setNoteTitle(e.target.value)}
                          />
                      </div>
                      <div>
                          <textarea 
                              className="w-full h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700 resize-none placeholder:text-slate-400"
                              placeholder="Write observations here..."
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                          />
                      </div>
                      <button 
                          onClick={handleSaveLocalNote}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                      >
                          <Save className="w-4 h-4" />
                          <span>Save Memo & Analysis</span>
                      </button>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Clarification Email</h3>
                    </div>
                    <button 
                        onClick={handleCopyEmail}
                        className={`text-xs font-medium flex items-center space-x-1 ${copiedEmail ? 'text-green-600' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                        {copiedEmail ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedEmail ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subject</label>
                        <input readOnly className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700" value={data.draft_email.subject} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Body</label>
                        <textarea readOnly className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 h-64 font-mono" value={data.draft_email.body} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Draft RFQ</h3>
                    </div>
                    <button 
                        onClick={handleCopyRfq}
                        className={`text-xs font-medium flex items-center space-x-1 ${copiedRfq ? 'text-green-600' : 'text-indigo-600 hover:text-indigo-800'}`}
                    >
                         {copiedRfq ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                         <span>{copiedRfq ? 'Copied!' : 'Copy Draft Text'}</span>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subject</label>
                        <input readOnly className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700" value={data.draft_rfq.subject} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Body</label>
                        <textarea readOnly className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 h-64 font-mono" value={data.draft_rfq.body} />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
