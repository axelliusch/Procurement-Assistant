
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { LogIn, FileText, KeyRound, Mail, ArrowRight, CheckCircle, Lock } from 'lucide-react';

type LoginView = 'login' | 'forgot_email' | 'forgot_otp' | 'forgot_new_pass';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // View State
  const [view, setView] = useState<LoginView>('login');

  // Form Data
  const [username, setUsername] = useState('axel');
  const [password, setPassword] = useState('0000');
  
  // Forgot Password Data
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI State
  const [greetingName, setGreetingName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dynamic greeting lookup
  useEffect(() => {
    if (username && view === 'login') {
        const users = authService.getUsers();
        const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        if (found && found.firstName) {
            setGreetingName(`${found.firstName} ${found.lastName || ''}`);
        } else {
            setGreetingName('');
        }
    } else {
        setGreetingName('');
    }
  }, [username, view]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
        const user = authService.login(username, password);
        if (user) {
          login(user);
          navigate('/');
        } else {
          setError('Invalid username or password. Please try again.');
        }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleSendOTP = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      try {
          const code = authService.requestPasswordReset(forgotEmail);
          // SIMULATION: In a real app, this goes to email service.
          // Here we alert the user.
          alert(`[SIMULATION] Email sent to ${forgotEmail}.\n\nYour One-Time Password is: ${code}`);
          setView('forgot_otp');
          setSuccessMsg(`OTP Code sent to ${forgotEmail}`);
      } catch (err: any) {
          setError(err.message);
      }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (authService.verifyOTP(forgotEmail, otp)) {
          setView('forgot_new_pass');
          setSuccessMsg('Code verified. Set your new password.');
      } else {
          setError('Invalid or expired code.');
      }
  };

  const handleResetPassword = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      try {
          authService.resetPassword(forgotEmail, otp, newPassword);
          setSuccessMsg('Password reset successfully! Please login.');
          
          // Reset fields
          setPassword('');
          setUsername(''); // Force them to re-enter or find username by email (optional, keeping simple)
          
          // Redirect to login after slight delay
          setTimeout(() => {
              setView('login');
              setSuccessMsg('');
              setForgotEmail('');
              setOtp('');
              setNewPassword('');
          }, 1500);
      } catch (err: any) {
          setError(err.message);
      }
  };

  const switchView = (newView: LoginView) => {
      setError('');
      setSuccessMsg('');
      setView(newView);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200">
        
        {/* Header Section */}
        <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center p-3 rounded-full mb-4 transition-colors ${view === 'login' ? 'bg-blue-50' : 'bg-indigo-50'}`}>
                {view === 'login' ? <FileText className="w-8 h-8 text-blue-600" /> : <KeyRound className="w-8 h-8 text-indigo-600" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
                {view === 'login' 
                    ? (greetingName ? greetingName : 'Welcome Back') 
                    : 'Account Recovery'}
            </h1>
            <p className="text-slate-500 mt-2">
                {view === 'login' ? 'Procurement Assistant' : 'Reset your password securely'}
            </p>
        </div>

        {/* Messages */}
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
                {error}
            </div>
        )}
        {successMsg && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-6 text-center border border-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 mr-2"/> {successMsg}
            </div>
        )}

        {/* --- VIEW: LOGIN --- */}
        {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input 
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Try 'axel'"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input 
                        type="password" 
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Try '0000'"
                    />
                </div>

                <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                >
                    <LogIn className="w-4 h-4 mr-2"/>
                    Sign In
                </button>
                
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => switchView('forgot_email')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                    >
                        Forgot Password?
                    </button>
                </div>
            </form>
        )}

        {/* --- VIEW: FORGOT - STEP 1: EMAIL --- */}
        {view === 'forgot_email' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registered Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="Enter your email address"
                        />
                    </div>
                </div>
                <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center"
                >
                    Send OTP Code <ArrowRight className="w-4 h-4 ml-2"/>
                </button>
                <button 
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full text-slate-500 py-2 text-sm hover:text-slate-700"
                >
                    Back to Sign In
                </button>
            </form>
        )}

        {/* --- VIEW: FORGOT - STEP 2: VERIFY OTP --- */}
        {view === 'forgot_otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
                 <div className="text-sm text-center text-slate-500 mb-2">
                     Check <strong>{forgotEmail}</strong> for a 6-digit code.
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-Digit Code</label>
                    <input 
                        type="text" 
                        required
                        maxLength={6}
                        className="w-full text-center tracking-widest text-2xl px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only numbers
                        placeholder="000000"
                    />
                </div>
                <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    Verify Code
                </button>
                <button 
                    type="button"
                    onClick={() => switchView('forgot_email')}
                    className="w-full text-slate-500 py-2 text-sm hover:text-slate-700"
                >
                    Change Email
                </button>
            </form>
        )}

        {/* --- VIEW: FORGOT - STEP 3: NEW PASSWORD --- */}
        {view === 'forgot_new_pass' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="password" 
                            required
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 4 characters"
                        />
                    </div>
                </div>
                <button 
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reset & Sign In
                </button>
            </form>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
