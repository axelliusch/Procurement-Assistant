import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { User, Lock, Save } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!user) return null;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const hasChanges = username !== user.username || firstName !== user.firstName || lastName !== user.lastName;
        
        if (hasChanges) {
            authService.updateProfile(user.id, { username, firstName, lastName });
            refreshUser();
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        }
    } catch (e: any) {
        setMessage({ type: 'error', text: e.message });
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        authService.updatePassword(user.id, currentPass, newPass);
        setCurrentPass('');
        setNewPass('');
        setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (e: any) {
        setMessage({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
        <p className="text-slate-500">Manage your account settings and security.</p>
      </div>

      {message.text && (
          <div className={`p-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-slate-400" />
            Basic Info
        </h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" disabled value={user.email} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input 
                        type="text" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Surname</label>
                    <input 
                        type="text" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Update Profile
            </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-slate-400" />
            Security
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input 
                    type="password" 
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input 
                    type="password" 
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>
            <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Change Password
            </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
