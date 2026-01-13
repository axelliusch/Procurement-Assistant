
import React, { useEffect, useState } from 'react';
import { Save, Plus, Search, Tag, Trash2, Edit2, Link as LinkIcon, X } from 'lucide-react';
import { Note, HistoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';

const NotesPage: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [proposals, setProposals] = useState<HistoryItem[]>([]);
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLabels, setFormLabels] = useState('');
  const [formLinkedProposal, setFormLinkedProposal] = useState('');

  useEffect(() => {
    const savedNotes = localStorage.getItem('procurement_notes_v2');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
        // Migration from v1 simple string note
        const oldNote = localStorage.getItem('procurement_notes');
        if (oldNote && user) {
            const migratedNote: Note = {
                id: uuidv4(),
                title: 'Migrated Memo',
                content: oldNote,
                labels: ['legacy'],
                createdAt: Date.now(),
                lastUpdatedAt: Date.now(),
                ownerId: user.id
            };
            setNotes([migratedNote]);
            localStorage.setItem('procurement_notes_v2', JSON.stringify([migratedNote]));
        }
    }

    const savedProposals = localStorage.getItem('procurement_history');
    if (savedProposals) {
      setProposals(JSON.parse(savedProposals));
    }
  }, [user]);

  const saveNotesToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('procurement_notes_v2', JSON.stringify(updatedNotes));
  };

  const handleSaveNote = () => {
    if (!formContent.trim() || !user) return;
    setSaveStatus('');

    const labelsArray = formLabels.split(',').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
    
    // Auto-generate title if empty
    let title = formTitle.trim();
    if (!title) {
        const firstLine = formContent.split('\n')[0];
        title = firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
    }

    if (activeNoteId) {
        // Update existing
        const updatedNotes = notes.map(n => {
            if (n.id === activeNoteId) {
                return {
                    ...n,
                    title,
                    content: formContent,
                    labels: labelsArray,
                    linkedProposalId: formLinkedProposal || undefined,
                    lastUpdatedAt: Date.now()
                };
            }
            return n;
        });
        saveNotesToStorage(updatedNotes);
    } else {
        // DUPLICATE CHECK
        const existingNote = notes.find(n => 
            n.ownerId === user.id &&
            n.title.trim() === title &&
            n.content.trim() === formContent.trim()
        );

        if (existingNote) {
            alert("A note with this exact title and content already exists.");
            return;
        }

        // Create new
        const newNote: Note = {
            id: uuidv4(),
            title,
            content: formContent,
            labels: labelsArray,
            linkedProposalId: formLinkedProposal || undefined,
            createdAt: Date.now(),
            lastUpdatedAt: Date.now(),
            ownerId: user.id
        };
        saveNotesToStorage([newNote, ...notes]);
    }

    resetForm();
  };

  const resetForm = () => {
    setIsEditing(false);
    setActiveNoteId(null);
    setFormTitle('');
    setFormContent('');
    setFormLabels('');
    setFormLinkedProposal('');
  };

  const handleEdit = (note: Note) => {
    setActiveNoteId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormLabels(note.labels.join(', '));
    setFormLinkedProposal(note.linkedProposalId || '');
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this memo?')) {
        const updatedNotes = notes.filter(n => n.id !== id);
        saveNotesToStorage(updatedNotes);
        if (activeNoteId === id) resetForm();
    }
  };

  // Filter Logic
  const allLabels = Array.from(new Set(notes.flatMap(n => n.labels))).sort();

  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.labels.some(l => l.includes(searchQuery.toLowerCase()));
    
    const matchesLabel = activeLabel ? note.labels.includes(activeLabel) : true;

    return matchesSearch && matchesLabel;
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
        {/* Left Column: List & Search */}
        <div className="w-1/3 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">My Notes</h2>
                <button 
                    type="button"
                    onClick={resetForm} 
                    className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                    title="Create New Note"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search notes..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Labels Filter */}
            {allLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeLabel && (
                         <button 
                            type="button"
                            onClick={() => setActiveLabel(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs flex items-center hover:bg-slate-300"
                         >
                            <X className="w-3 h-3 mr-1" /> Clear
                         </button>
                    )}
                    {allLabels.map(label => (
                        <button
                            type="button"
                            key={label}
                            onClick={() => setActiveLabel(activeLabel === label ? null : label)}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${
                                activeLabel === label 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                            }`}
                        >
                            #{label}
                        </button>
                    ))}
                </div>
            )}

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {filteredNotes.length === 0 ? (
                    <div className="text-center text-slate-400 py-8 text-sm">
                        No notes found.
                    </div>
                ) : (
                    filteredNotes.map(note => (
                        <div 
                            key={note.id} 
                            onClick={() => handleEdit(note)}
                            className={`bg-white p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                                activeNoteId === note.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold text-slate-800 truncate pr-2">{note.title}</h3>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {new Date(note.lastUpdatedAt).toLocaleDateString('en-GB')}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-2">{note.content}</p>
                            
                            <div className="flex flex-wrap gap-1 items-center">
                                {note.linkedProposalId && (
                                    <span className="inline-flex items-center text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                                        <LinkIcon className="w-3 h-3 mr-1" />
                                        Linked
                                    </span>
                                )}
                                {note.labels.slice(0, 3).map(l => (
                                    <span key={l} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                        #{l}
                                    </span>
                                ))}
                                {note.labels.length > 3 && (
                                    <span className="text-[10px] text-slate-400">+{note.labels.length - 3}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right Column: Editor */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-700">
                    {activeNoteId ? 'Edit Note' : 'Create Note'}
                </h3>
                <div className="flex items-center space-x-2">
                    {activeNoteId && (
                        <button 
                            type="button"
                            onClick={() => handleDelete(activeNoteId)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Memo"
                        >
                            <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={handleSaveNote}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                    >
                        <Save className="w-4 h-4" />
                        <span>Save Note</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <input 
                    type="text"
                    placeholder="Note Title (optional)"
                    className="w-full text-lg font-bold text-slate-800 placeholder:text-slate-300 border-none focus:ring-0 focus:outline-none p-0"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                />
                
                <textarea
                    className="w-full h-64 resize-none text-slate-600 placeholder:text-slate-300 border-none focus:ring-0 focus:outline-none p-0 leading-relaxed"
                    placeholder="Write your thoughts here..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                />

                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Labels (comma separated)</label>
                        <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="pricing, urgent, review..." 
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formLabels}
                                onChange={(e) => setFormLabels(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Link to Proposal</label>
                        <div className="flex items-center space-x-2">
                            <LinkIcon className="w-4 h-4 text-slate-400" />
                            <select 
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formLinkedProposal}
                                onChange={(e) => setFormLinkedProposal(e.target.value)}
                            >
                                <option value="">-- No linked proposal --</option>
                                {proposals.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.vendorName} - {p.fileName} ({new Date(p.timestamp).toLocaleDateString('en-GB')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default NotesPage;
