
import React, { useEffect, useState } from 'react';
import { HistoryItem, Note } from '../types';
import { Clock, Search, Trash2, StickyNote, Globe, ArrowRight } from 'lucide-react';
import AnalysisView from '../components/AnalysisView';
import { useAuth } from '../context/AuthContext';
import { libraryService } from '../services/libraryService';
import { v4 as uuidv4 } from 'uuid';

const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = () => {
      if(user) {
          // Get ONLY personal library items
          setHistory(libraryService.getPersonalLibrary(user.id));
      }
  }

  useEffect(() => {
    if (selectedItem) {
        loadRelatedNotes();
    }
  }, [selectedItem, user]);

  const loadRelatedNotes = () => {
      if (!selectedItem) return;
      const savedNotes = localStorage.getItem('procurement_notes_v2');
      if (savedNotes) {
          const allNotes: Note[] = JSON.parse(savedNotes);
          const linked = allNotes.filter(n => n.linkedProposalId === selectedItem.id && n.ownerId === user?.id);
          setRelatedNotes(linked);
      } else {
          setRelatedNotes([]);
      }
  };

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this analysis?")) {
        libraryService.deleteFromPersonal(id);
        loadHistory();
        if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  const handlePublish = (e: React.MouseEvent, item: HistoryItem) => {
      e.stopPropagation();
      if (!user) return;
      if (window.confirm("Publish to Collective Library? This will remove it from your Personal list.")) {
          libraryService.publishToCollective(item, user);
          loadHistory(); // It should disappear from list
          setSelectedItem(null); 
      }
  };

  const handleSaveNote = (title: string, content: string): boolean => {
      if (!user || !selectedItem) return false;

      const savedNotes = localStorage.getItem('procurement_notes_v2');
      const currentNotes: Note[] = savedNotes ? JSON.parse(savedNotes) : [];

      // Duplicate Check
      const duplicate = currentNotes.find(n => 
        n.ownerId === user.id && 
        n.title.trim() === title.trim() && 
        n.content.trim() === content.trim()
      );

      if (duplicate) return false;

      const newNote: Note = {
          id: uuidv4(),
          title: title || 'Quick Memo',
          content: content,
          labels: ['history-memo'],
          linkedProposalId: selectedItem.id,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          ownerId: user.id
      };

      localStorage.setItem('procurement_notes_v2', JSON.stringify([newNote, ...currentNotes]));
      loadRelatedNotes();
      return true;
  };

  const displayedHistory = history.filter(item => 
      item.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      {!selectedItem ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Personal Analysis History</h2>
              <p className="text-slate-500">Review your recent analyses before publishing.</p>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search vendor or file..." 
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {displayedHistory.length > 0 ? (
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Vendor</th>
                        <th className="px-6 py-4">File</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {displayedHistory.map((item) => (
                        <tr 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
                        >
                        <td className="px-6 py-4 text-slate-600">
                            <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-2 text-slate-400" />
                                {new Date(item.timestamp).toLocaleDateString('en-GB')}
                            </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{item.vendorName}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{item.fileName}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColorClass(item.score)}`}>
                            {item.score} / 100
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={(e) => handlePublish(e, item)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                title="Publish to Collective Library"
                            >
                                <Globe className="w-4 h-4 pointer-events-none" />
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => deleteItem(e, item.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4 pointer-events-none" />
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-500">
                    <p>No personal analysis history found.</p>
                </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <button 
                    onClick={() => setSelectedItem(null)}
                    className="text-sm text-slate-500 hover:text-blue-600 flex items-center"
                >
                    ← Back to History
                </button>
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={(e) => handlePublish(e, selectedItem)}
                        className="flex items-center text-xs font-medium bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Publish to Collective <ArrowRight className="w-3 h-3 ml-2 pointer-events-none" />
                    </button>
                </div>
            </div>
            
            <AnalysisView 
                data={selectedItem.data} 
                onSaveNote={handleSaveNote} 
            />

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <StickyNote className="w-5 h-5 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-800">My Memos</h3>
                </div>
                
                {relatedNotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {relatedNotes.map(note => (
                            <div key={note.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="font-semibold text-slate-800 mb-1">{note.title}</h4>
                                <p className="text-sm text-slate-600 line-clamp-3 mb-2">{note.content}</p>
                                <div className="mt-2 text-xs text-slate-400 text-right">
                                    {new Date(note.lastUpdatedAt).toLocaleDateString('en-GB')}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm italic">You haven't added any memos to this proposal yet.</p>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
