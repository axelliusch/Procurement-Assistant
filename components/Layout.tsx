
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, History, FileText, StickyNote, Settings, LogOut, Building2, User, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

  if (!user) {
      return <div className="bg-slate-50 min-h-screen">{children}</div>;
  }

  const navItems = [
    { name: 'Upload Proposal', path: '/', icon: Upload },
    { name: 'Vendors', path: '/vendors', icon: Building2 }, // Merged directory
    { name: 'History', path: '/history', icon: History },
    { name: 'Comparison', path: '/comparison', icon: LayoutDashboard },
    { name: 'Notes', path: '/notes', icon: StickyNote }, // Renamed from Memo to Notes
    { name: 'Profile', path: '/profile', icon: User },
    ...(user.role === 'admin' ? [{ name: 'Settings', path: '/settings', icon: Settings }] : []),
  ];

  const faqItems = [
      { q: "How do I share a vendor?", a: "Go to History or your Personal Library in Vendors, open an analysis, and click 'Publish to Collective'. It will move from your private view to the shared team view." },
      { q: "Where did my analysis go?", a: "If you published an analysis to the Collective Library, it is removed from your Personal Library to prevent duplicates. You can view it in the 'Collective Library' tab." },
      { q: "Can I delete a vendor?", a: "You can delete anything in your Personal Library. In the Collective Library, you can only delete items you originally uploaded (unless you are an Admin)." },
      { q: "How does the Score work?", a: "The AI evaluates the proposal based on the weighted criteria defined in Settings (Price, Technical, Delivery, Warranty, Credibility)." },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 z-20 transition-all duration-300 shadow-xl`}
      >
        <div className="p-4 flex items-center justify-between">
            {!isCollapsed && (
                <div className="flex items-center space-x-2 animate-fade-in">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <h1 className="text-xl font-bold text-white tracking-tight">Procurement AI</h1>
                </div>
            )}
            {isCollapsed && <FileText className="w-6 h-6 text-blue-400 mx-auto" />}
            
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-slate-500 hover:text-white transition-colors"
            >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
        </div>

        <div className={`p-4 ${isCollapsed ? 'text-center' : ''}`}>
             {!isCollapsed ? (
                 <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium text-white">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}
                    </div>
                    {/* Only show Admin badge, Analyst is blank */}
                    {user.role === 'admin' && (
                        <div className="flex items-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-indigo-500 text-white">
                                Admin
                            </span>
                        </div>
                    )}
                 </div>
             ) : (
                 <div className="flex justify-center">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        {user.firstName?.[0] || user.username[0].toUpperCase()}
                    </div>
                 </div>
             )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'hover:bg-slate-800 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4">
          <button 
            onClick={handleLogout}
            className={`flex items-center space-x-3 px-3 py-2 w-full text-slate-400 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* FAQ Button */}
      <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setShowFaq(!showFaq)}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 flex items-center justify-center"
            title="Frequently Asked Questions"
          >
              {showFaq ? <ChevronRight className="w-6 h-6 rotate-90" /> : <HelpCircle className="w-6 h-6" />}
          </button>
          
          {showFaq && (
              <div className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 animate-fade-in origin-bottom-right">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center">
                      <HelpCircle className="w-4 h-4 mr-2 text-blue-500" />
                      Help & FAQ
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {faqItems.map((item, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <p className="text-xs font-bold text-slate-700 mb-1">{item.q}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default Layout;
