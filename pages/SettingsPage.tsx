
import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Cpu, UserPlus, CheckCircle, AlertCircle, Trash2, Users, User as UserIcon } from 'lucide-react';
import { AppSettings, UserRole, User } from '../types';
import { getSettings, saveSettings, resetSettings } from '../services/settingsService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'scoring' | 'prompts' | 'users'>('general');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // User Management State
  const [userList, setUserList] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      role: 'analyst' as UserRole
  });
  const [userMsg, setUserMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
        setUserList(authService.getUsers());
    }
  }, [activeTab]);

  const handleChange = (key: keyof AppSettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(resetSettings());
      setSaveStatus('Settings reset to defaults.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
      e.preventDefault();
      setUserMsg({ type: '', text: '' });

      try {
          if(!newUser.username || !newUser.password || !newUser.firstName || !newUser.email) {
              throw new Error("All fields are required");
          }
          authService.adminCreateUser(newUser, false); // false = do not auto-login
          
          setUserMsg({ type: 'success', text: `User ${newUser.username} created successfully!` });
          setNewUser({
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            password: '',
            role: 'analyst'
          });
          setUserList(authService.getUsers()); // Refresh list
      } catch (err: any) {
          setUserMsg({ type: 'error', text: err.message });
      }
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (userId === user?.id) {
        alert("You cannot delete your own account.");
        return;
    }
    if (window.confirm(`Are you sure you want to delete user '${username}'? This action cannot be undone.`)) {
        try {
            authService.deleteUser(userId);
            setUserList(authService.getUsers()); // Refresh list
            setUserMsg({ type: 'success', text: `User ${username} deleted.` });
            setTimeout(() => setUserMsg({ type: '', text: '' }), 3000);
        } catch (err: any) {
            setUserMsg({ type: 'error', text: err.message });
        }
    }
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Configuration</h2>
           <p className="text-slate-500">Customize the AI's behavior, scoring logic, output templates, and manage users.</p>
        </div>
        <div className="flex space-x-3">
            <button 
                type="button"
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Defaults</span>
            </button>
            <button 
                type="button"
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
            </button>
        </div>
      </div>

      {/* Global AI Selector - Persistent across tabs */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Cpu className="w-5 h-5" />
              </div>
              <div>
                  <h3 className="text-sm font-semibold text-indigo-900">Active AI Model</h3>
                  <p className="text-xs text-indigo-700">Select which Gemini model processes your documents.</p>
              </div>
          </div>
          <div className="min-w-[200px]">
              <select 
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={settings.aiModel || 'gemini-3-flash-preview'}
                  onChange={(e) => handleChange('aiModel', e.target.value)}
              >
                  <option value="gemini-3-flash-preview">Gemini 3.0 Flash (Fastest)</option>
                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Best Reasoning)</option>
                  <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash (Stable)</option>
              </select>
          </div>
      </div>

      {saveStatus && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 text-sm">
            {saveStatus}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
            <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
                General & Role
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('scoring')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'scoring' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
                Scoring Engine
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('prompts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'prompts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
                Prompt Library
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >
                User Management
            </button>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'general' && (
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Global System Instruction / Persona</label>
                    <p className="text-xs text-slate-500 mb-3">This defines the core identity and rules for the AI.</p>
                    <textarea 
                        className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed"
                        value={settings.globalRole}
                        onChange={(e) => handleChange('globalRole', e.target.value)}
                    />
                </div>
            </div>
        )}

        {activeTab === 'scoring' && (
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Global Scoring Weights & Logic</label>
                    <p className="text-xs text-slate-500 mb-3">Define how the AI should calculate the score (0-100). Include specific weights for Price, Technical, Delivery, etc.</p>
                    <textarea 
                        className="w-full h-96 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed"
                        value={settings.scoringWeights}
                        onChange={(e) => handleChange('scoringWeights', e.target.value)}
                    />
                </div>
            </div>
        )}

        {activeTab === 'prompts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Executive Summary Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptSummary}
                            onChange={(e) => handleChange('promptSummary', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Gap Analysis Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptGaps}
                            onChange={(e) => handleChange('promptGaps', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Ambiguity Detection Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptAmbiguities}
                            onChange={(e) => handleChange('promptAmbiguities', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">History Log / Audit Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptHistory}
                            onChange={(e) => handleChange('promptHistory', e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Clarification Email Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptEmail}
                            onChange={(e) => handleChange('promptEmail', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">RFQ Generator Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptRfq}
                            onChange={(e) => handleChange('promptRfq', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Vendor Credibility Prompt</label>
                        <textarea 
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                            value={settings.promptCredibility}
                            onChange={(e) => handleChange('promptCredibility', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create New User Section */}
                <div>
                     <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                        <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                        Create New Account
                     </h3>
                     <p className="text-sm text-slate-500 mb-6">
                         Add new team members manually. They can use the credentials below to log in immediately.
                     </p>

                     {userMsg.text && (
                         <div className={`p-4 rounded-lg text-sm mb-6 flex items-start ${userMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                             {userMsg.type === 'error' ? <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
                             {userMsg.text}
                         </div>
                     )}

                     <form onSubmit={handleCreateUser} className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUser.firstName}
                                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUser.lastName}
                                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                                />
                             </div>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input 
                                type="email" 
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newUser.email}
                                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                />
                             </div>
                         </div>
                         
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                             <div className="flex items-center space-x-6">
                                 <label className="flex items-center space-x-2 cursor-pointer">
                                     <input 
                                        type="radio" 
                                        name="role" 
                                        value="analyst" 
                                        checked={newUser.role === 'analyst'}
                                        onChange={() => setNewUser({...newUser, role: 'analyst'})}
                                        className="text-blue-600 focus:ring-blue-500"
                                     />
                                     <span className="text-sm text-slate-700">Analyst (Standard)</span>
                                 </label>
                                 <label className="flex items-center space-x-2 cursor-pointer">
                                     <input 
                                        type="radio" 
                                        name="role" 
                                        value="admin" 
                                        checked={newUser.role === 'admin'}
                                        onChange={() => setNewUser({...newUser, role: 'admin'})}
                                        className="text-blue-600 focus:ring-blue-500"
                                     />
                                     <span className="text-sm text-slate-700">Admin (Full Access)</span>
                                 </label>
                             </div>
                         </div>

                         <div className="pt-4">
                             <button 
                                type="submit" 
                                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                             >
                                 Create User
                             </button>
                         </div>
                     </form>
                </div>

                {/* Manage Existing Users Section */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-fit">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-slate-500" />
                        Existing Accounts
                    </h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {userList.map(u => (
                            <div key={u.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{u.username}</p>
                                        <p className="text-xs text-slate-500 capitalize">{u.role} • {u.firstName} {u.lastName}</p>
                                    </div>
                                </div>
                                {u.id !== user?.id && (
                                    <button 
                                        type="button"
                                        onClick={() => handleDeleteUser(u.id, u.username)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                {u.id === user?.id && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">You</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
