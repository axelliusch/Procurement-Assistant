import React, { useState, useEffect } from 'react';
import { X, User, Search, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Colleague } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (colleagueId: string) => void;
  itemTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, onShare, itemTitle }) => {
  const { user } = useAuth();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen && user) {
        setColleagues(authService.getColleagues(user.id));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const filtered = colleagues.filter(c => c.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-800 flex items-center">
                    <Share2 className="w-4 h-4 mr-2 text-blue-600" />
                    Share Analysis
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="p-4">
                <p className="text-sm text-slate-500 mb-4">
                    Sharing <span className="font-semibold text-slate-700">"{itemTitle}"</span> with a colleague. They will have read-only access.
                </p>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search colleagues..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                    {filtered.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-4">No colleagues found.</p>
                    ) : (
                        filtered.map(c => (
                            <button
                                key={c.userId}
                                onClick={() => onShare(c.userId)}
                                className="w-full flex items-center p-3 hover:bg-slate-50 rounded-lg transition-colors group"
                            >
                                <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-slate-700">{c.username}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ShareModal;
