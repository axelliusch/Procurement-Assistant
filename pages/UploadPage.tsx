
import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Eye, ArrowLeft, Trash2, Play, RefreshCw, Clock, FileText, X, Cpu } from 'lucide-react';
import { analyzeProposal, fileToBase64 } from '../services/geminiService';
import AnalysisView from '../components/AnalysisView';
import { AnalysisResult, HistoryItem, Note } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { libraryService } from '../services/libraryService';

interface QueueItem {
  id: string;
  file: File;
  status: 'idle' | 'analyzing' | 'success' | 'error';
  result?: AnalysisResult;
  error?: string;
  saved?: boolean;
  historyId?: string;
}

const UploadPage: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  
  // Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  
  // Smooth Progress Simulation
  const [currentFileProgress, setCurrentFileProgress] = useState(0); // 0-100 for the CURRENT file
  
  // Refs to manage intervals without causing re-renders loop
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Heuristic: Estimated seconds per document analysis (used for bar speed only, not displayed)
  const SECONDS_PER_DOC = 12; 

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Calculate Total Percentage
  // Formula: ( (ProcessedCount * 100) + CurrentFileProgress ) / TotalFiles
  // We clamp it to 100 to avoid the "Scan error" visual glitch where it exceeds 100%
  const totalPercentage = totalFilesToProcess > 0 
    ? Math.min(100, Math.round(((processedCount * 100) + currentFileProgress) / totalFilesToProcess)) 
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: QueueItem[] = Array.from(e.target.files).map((file: File) => ({
        id: uuidv4(),
        file: file,
        status: 'idle'
      }));
      setQueue(prev => [...prev, ...newItems]);
      e.target.value = ''; 
    }
  };

  const removeFile = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setQueue(prev => prev.filter(i => i.id !== id));
    if (viewingItemId === id) setViewingItemId(null);
  };

  const clearAll = () => {
      if (window.confirm("Clear all files?")) {
          setQueue([]);
          setViewingItemId(null);
          setProcessedCount(0);
          setTotalFilesToProcess(0);
          setCurrentFileProgress(0);
          setTotalTokensUsed(0);
          setIsProcessing(false);
      }
  };

  const startProgressSimulation = () => {
      setCurrentFileProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      // Increment progress every 200ms
      // We want to reach ~90% in SECONDS_PER_DOC, then wait for actual completion
      const increment = 100 / (SECONDS_PER_DOC * 5); 

      progressIntervalRef.current = setInterval(() => {
          setCurrentFileProgress(prev => {
              // Slow down significantly as we approach 90% to assume "thinking" time
              if (prev >= 90) return prev + 0.1; 
              if (prev >= 99) return 99;
              return prev + increment;
          });
      }, 200);
  };

  const stopProgressSimulation = () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      // We do NOT jump to 100 here immediately to prevent visual jumps if another file starts instantly
      // Instead, we let the processedCount increment handle the math in totalPercentage
      setCurrentFileProgress(0); 
  };

  const handleAnalyze = async () => {
    const itemsToProcess = queue.filter(i => i.status === 'idle' || i.status === 'error');
    if (itemsToProcess.length === 0) return;

    setIsProcessing(true);
    setTotalFilesToProcess(itemsToProcess.length);
    setProcessedCount(0);
    setTotalTokensUsed(0);

    for (const item of itemsToProcess) {
       // Update UI to show analyzing
       setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'analyzing', error: undefined } : i));
       
       // Start smooth bar for this file
       startProgressSimulation();

       try {
           const base64 = await fileToBase64(item.file);
           const result = await analyzeProposal(base64, item.file.type);
           setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', result } : i));
           
           if (result.tokenUsage) {
               setTotalTokensUsed(prev => prev + result.tokenUsage!.totalTokens);
           }

       } catch (err: any) {
           console.error(err);
           setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message || "Analysis failed" } : i));
       } finally {
           stopProgressSimulation();
           setProcessedCount(prev => prev + 1);
       }
    }

    setIsProcessing(false);
  };

  const saveToHistory = (item: QueueItem): string | null => {
    if (!item.result || !user) return null;
    if (item.historyId) return item.historyId;

    const newId = uuidv4();
    const historyItem: HistoryItem = {
      id: newId,
      timestamp: Date.now(),
      fileName: item.file.name,
      vendorName: item.result.vendor_identification?.vendor_name || item.result.vendor_check_inputs.registered_name || "Unknown",
      score: item.result.score,
      data: item.result,
      ownerId: user.id
    };

    // Use Library Service for Personal Library
    libraryService.addToPersonal(historyItem);
    
    setQueue(prev => prev.map(i => i.id === item.id ? { ...i, saved: true, historyId: newId } : i));
    return newId;
  };

  const handleSaveNote = (item: QueueItem, title: string, content: string): boolean => {
      if (!user) return false;
      const historyId = saveToHistory(item);
      if (!historyId) return false;

      // Duplicate Check
      const savedNotes = localStorage.getItem('procurement_notes_v2');
      const currentNotes: Note[] = savedNotes ? JSON.parse(savedNotes) : [];
      
      const duplicate = currentNotes.find(n => 
        n.ownerId === user.id && 
        n.title.trim() === title.trim() && 
        n.content.trim() === content.trim()
      );

      if (duplicate) {
        return false; // Indicate duplicate found
      }

      const newNote: Note = {
          id: uuidv4(),
          title: title || 'Quick Analysis Memo',
          content: content,
          labels: ['quick-memo'],
          linkedProposalId: historyId,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          ownerId: user.id
      };

      localStorage.setItem('procurement_notes_v2', JSON.stringify([newNote, ...currentNotes]));
      return true;
  };

  // View Mode
  if (viewingItemId) {
      const item = queue.find(i => i.id === viewingItemId);
      if (item && item.result) {
          return (
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <button 
                        type="button"
                        onClick={() => setViewingItemId(null)}
                        className="text-sm text-slate-500 hover:text-blue-600 flex items-center px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to File List
                    </button>
                    <div className="flex items-center space-x-2">
                         <span className="text-sm font-medium text-slate-600">{item.file.name}</span>
                         {item.saved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Saved to Personal Library</span>}
                    </div>
                  </div>
                  <AnalysisView 
                    data={item.result} 
                    onSave={() => item && saveToHistory(item)} 
                    isSaved={item.saved} 
                    onSaveNote={(title, content) => handleSaveNote(item, title, content)}
                  />
              </div>
          );
      }
  }

  const idleCount = queue.filter(i => i.status === 'idle').length;
  const errorCount = queue.filter(i => i.status === 'error').length;
  const processingItem = queue.find(i => i.status === 'analyzing');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Upload Proposals</h2>
        <p className="text-slate-500">Analyze supplier documents. Results are saved to your Personal Library.</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center transition-all hover:border-blue-300">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-50 p-4 rounded-full">
            <UploadCloud className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <label className="block mb-4 cursor-pointer">
          <span className="sr-only">Choose files</span>
          <input 
            type="file" 
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer
            "
            accept=".pdf, .png, .jpg, .jpeg"
            multiple
            onChange={handleFileChange}
          />
        </label>
        <p className="text-xs text-slate-400">Supported formats: PDF, PNG, JPG</p>
      </div>

      {/* Progress Bar Section */}
      {(isProcessing || totalTokensUsed > 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 animate-fade-in">
              <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-blue-900 font-semibold flex items-center">
                        {isProcessing ? 'Analyzing Documents...' : 'Analysis Complete'}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2">
                        {isProcessing && (
                            <p className="text-xs text-slate-500">
                                Currently processing: <span className="font-medium text-slate-700">{processingItem?.file.name || '...'}</span>
                                <span className="ml-2 text-slate-400">({processedCount + 1} of {totalFilesToProcess})</span>
                            </p>
                        )}
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center">
                            <Cpu className="w-3 h-3 mr-1" />
                            API Usage: {totalTokensUsed.toLocaleString()} tokens
                        </span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{totalPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-linear" 
                    style={{ width: `${totalPercentage}%` }}
                  ></div>
              </div>
          </div>
      )}

      {/* Queue List */}
      {queue.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700">Files ({queue.length})</h3>
                  <div className="flex space-x-2">
                       {(idleCount > 0 || errorCount > 0) && (
                           <button 
                                type="button"
                                onClick={handleAnalyze}
                                disabled={isProcessing}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isProcessing ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                           >
                                {isProcessing 
                                    ? <span className="flex items-center">Processing...</span> 
                                    : (errorCount > 0 ? <RefreshCw className="w-4 h-4" /> : <Play className="w-4 h-4" />)
                                }
                                {!isProcessing && <span>
                                    {errorCount > 0 && idleCount === 0 
                                            ? `Retry ${errorCount} Failed`
                                            : `Analyze ${idleCount + errorCount} File${(idleCount + errorCount) !== 1 ? 's' : ''}`
                                    }
                                </span>}
                           </button>
                       )}
                       <button type="button" onClick={clearAll} className="text-slate-500 hover:text-red-600 px-3 py-2 rounded hover:bg-red-50 transition-colors text-sm">
                           Clear All
                       </button>
                  </div>
              </div>
              
              <div className="divide-y divide-slate-100">
                  {queue.map(item => (
                      <div key={item.id} className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                              <div className={`p-2 rounded-lg mt-1 ${item.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                  {item.status === 'success' ? <CheckCircle className="w-5 h-5"/> : <FileText className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-slate-800 truncate">{item.file.name}</p>
                                        <p className="text-xs text-slate-500">{(item.file.size / 1024).toFixed(1)} KB</p>
                                      </div>
                                  </div>
                                  
                                  {item.status === 'error' && (
                                      <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700 flex items-start animate-fade-in">
                                          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1">
                                            <span className="font-bold block mb-0.5">Analysis Failed</span>
                                            <span className="leading-relaxed">{item.error}</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="flex items-center space-x-4 ml-4">
                              {item.status === 'idle' && (
                                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">Ready</span>
                              )}
                              {item.status === 'analyzing' && (
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center">
                                      Analyzing... {Math.round(currentFileProgress)}%
                                  </span>
                              )}
                              {item.status === 'success' && (
                                  <div className="flex flex-col items-end">
                                       <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded flex items-center mb-1">
                                            Done
                                       </span>
                                       {item.result && (
                                           <div className="flex flex-col items-end">
                                               <span className={`text-[10px] font-bold ${item.result.score >= 80 ? 'text-green-600' : item.result.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                   Score: {item.result.score}
                                               </span>
                                               {item.result.tokenUsage && (
                                                   <span className="text-[9px] text-slate-400 mt-0.5">
                                                       {item.result.tokenUsage.totalTokens} tokens
                                                   </span>
                                               )}
                                           </div>
                                       )}
                                  </div>
                              )}
                              <div className="flex items-center space-x-1">
                                  {item.status === 'success' && (
                                      <button 
                                          type="button"
                                          onClick={() => setViewingItemId(item.id)}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                          title="View Report"
                                      >
                                          <Eye className="w-5 h-5 pointer-events-none" />
                                      </button>
                                  )}
                                  
                                  <button 
                                      type="button"
                                      onClick={(e) => removeFile(item.id, e)}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                      title="Remove"
                                  >
                                      {item.status === 'success' ? <Trash2 className="w-5 h-5 pointer-events-none" /> : <X className="w-5 h-5 pointer-events-none" />}
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default UploadPage;
