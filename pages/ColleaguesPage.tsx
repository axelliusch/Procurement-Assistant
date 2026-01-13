import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Colleague } from '../types';
import { Users, UserPlus, Search, Trash2, User } from 'lucide-react';

const ColleaguesPage: React.FC = () => {
  const { user } = useAuth();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (user) {
        loadColleagues();
    }
  }, [user]);

  const loadColleagues = () => {
    if (user) {
        setColleagues(authService.getColleagues(user.id));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !searchUsername) return;
    setStatus('');

    try {
        authService.addColleague(user.id, searchUsername);
        loadColleagues();
        setSearchUsername('');
        setStatus('Colleague added successfully');
    } catch (e: any) {
        setStatus(e.message);
    }
  };

  const handleRemove = (colleagueId: string) => {
      if(!user) return;
      if (window.confirm("Remove this colleague?")) {
        authService.removeColleague(user.id, colleagueId);
        loadColleagues();
      }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Colleagues</h2>
        <p className="text-slate-500">Manage your network for sharing proposals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Add Colleague */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                Add Colleague
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text"
                            placeholder="Search by username..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                        />
                    </div>
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Add to Network
                </button>
                {status && (
                    <p className={`text-sm text-center ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                        {status}
                    </p>
                )}
            </form>
         </div>

         {/* List */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-semibold text-slate-700 flex items-center">
                     <Users className="w-4 h-4 mr-2" />
                     Your Network ({colleagues.length})
                 </h3>
             </div>
             {colleagues.length === 0 ? (
                 <div className="p-8 text-center text-slate-500 text-sm">
                     No colleagues added yet.
                 </div>
             ) : (
                 <div className="divide-y divide-slate-100">
                     {colleagues.map(c => (
                         <div key={c.userId} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                             <div className="flex items-center space-x-3">
                                 <div className="bg-slate-200 p-2 rounded-full">
                                     <User className="w-4 h-4 text-slate-600" />
                                 </div>
                                 <div>
                                     <p className="font-medium text-slate-800">{c.username}</p>
                                     <p className="text-xs text-slate-500">Added {new Date(c.addedAt).toLocaleDateString('en-GB')}</p>
                                 </div>
                             </div>
                             <button 
                                onClick={() => handleRemove(c.userId)}
                                className="text-slate-400 hover:text-red-600 p-2"
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default ColleaguesPage;