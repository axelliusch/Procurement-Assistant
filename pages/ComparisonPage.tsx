
import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../types';
import { Check, X, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { libraryService } from '../services/libraryService';

const ComparisonPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
        // Only load Personal Library for comparison
        setHistory(libraryService.getPersonalLibrary(user.id));
    }
  }, [user]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert("You can compare up to 3 proposals at a time.");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedItems = history.filter(h => selectedIds.includes(h.id));

  const allFieldNames = Array.from(new Set(
    selectedItems.flatMap(item => item.data.extracted_fields.map(f => f.name))
  ));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Proposal Comparison</h2>
        <p className="text-slate-500">Compare items from your Personal Library side-by-side.</p>
      </div>

      {history.length === 0 ? (
         <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500">
            <Lock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Your Personal Library is empty.</p>
            <p className="text-xs mt-1">Upload proposals or save items from the Collective Library to compare them.</p>
         </div>
      ) : (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Select Proposals (Max 3)</h3>
            <div className="flex flex-wrap gap-2">
            {history.map(item => (
                <button
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all flex items-center space-x-2
                    ${selectedIds.includes(item.id) 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                >
                <span>{item.vendorName}</span>
                <span className="opacity-75 text-xs">({new Date(item.timestamp).toLocaleDateString('en-GB')})</span>
                {selectedIds.includes(item.id) && <Check className="w-3 h-3 ml-1" />}
                </button>
            ))}
            </div>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-1/4 text-slate-500 font-medium uppercase text-xs">Feature / Criterion</th>
                {selectedItems.map(item => (
                  <th key={item.id} className="p-4 w-1/4 border-l border-slate-200">
                    <div className="font-bold text-slate-800 text-lg">{item.vendorName}</div>
                    <div className="text-xs text-slate-500">{item.fileName}</div>
                    <div className={`mt-2 inline-block px-2 py-1 rounded text-xs font-bold ${
                        item.score >= 80 ? 'bg-green-100 text-green-700' : 
                        item.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                        Score: {item.score}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-100">
                <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">Executive Summary</td>
                {selectedItems.map(item => (
                  <td key={item.id} className="p-4 border-l border-slate-100 text-slate-600 align-top">
                    <p className="line-clamp-4 hover:line-clamp-none transition-all">{item.data.summary}</p>
                  </td>
                ))}
              </tr>

              {allFieldNames.map(fieldName => (
                <tr key={fieldName} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-700 bg-slate-50/30">{fieldName}</td>
                  {selectedItems.map(item => {
                    const field = item.data.extracted_fields.find(f => f.name === fieldName);
                    return (
                      <td key={item.id} className="p-4 border-l border-slate-100 text-slate-600">
                        {field ? (
                            <span>{field.value} <span className="text-slate-400 text-xs">{field.unit}</span></span>
                        ) : (
                            <span className="text-slate-300 italic">N/A</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="border-b border-slate-100">
                 <td className="p-4 font-semibold text-red-700 bg-red-50/20">Identified Gaps</td>
                 {selectedItems.map(item => (
                    <td key={item.id} className="p-4 border-l border-slate-100 align-top">
                        {item.data.gaps.length > 0 ? (
                            <ul className="list-disc list-inside text-red-600 space-y-1">
                                {item.data.gaps.map((g, i) => <li key={i}>{g}</li>)}
                            </ul>
                        ) : (
                            <span className="text-green-600 flex items-center"><Check className="w-4 h-4 mr-1"/> None detected</span>
                        )}
                    </td>
                 ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComparisonPage;
