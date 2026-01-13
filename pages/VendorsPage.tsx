
import React, { useEffect, useState } from 'react';
import { HistoryItem, AnalysisResult, VendorCredibilityAnalysis, Note } from '../types';
import { Search, Building2, Calendar, FileText, ExternalLink, ArrowRight, ShieldCheck, MapPin, Linkedin, UploadCloud, Download, Trash2, User, Globe, StickyNote } from 'lucide-react';
import AnalysisView from '../components/AnalysisView';
import { useAuth } from '../context/AuthContext';
import { libraryService } from '../services/libraryService';
import { v4 as uuidv4 } from 'uuid';

interface VendorGroup {
  name: string;
  proposalCount: number;
  avgScore: number;
  lastInteraction: number;
  latestData: AnalysisResult;
  items: HistoryItem[]; // All items belonging to this vendor
}

const VendorsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'collective'>('personal');
  const [vendors, setVendors] = useState<VendorGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedVendor, setSelectedVendor] = useState<VendorGroup | null>(null);
  const [viewingProposal, setViewingProposal] = useState<HistoryItem | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);

  useEffect(() => {
    loadVendors();
  }, [user, activeTab]);

  const loadVendors = () => {
      if (!user) return;
      let rawItems: HistoryItem[] = [];

      if (activeTab === 'personal') {
          rawItems = libraryService.getPersonalLibrary(user.id);
      } else {
          rawItems = libraryService.getCollectiveLibrary();
      }

      processVendors(rawItems);
  };

  const processVendors = (items: HistoryItem[]) => {
    const groups: { [key: string]: HistoryItem[] } = {};
    
    items.forEach(item => {
      const name = item.data.vendor_identification?.vendor_name || 
                   item.data.vendor_check_inputs.registered_name || 
                   item.vendorName || 
                   'Unknown Vendor';
                   
      if (!groups[name]) groups[name] = [];
      groups[name].push(item);
    });

    const groupList: VendorGroup[] = Object.keys(groups).map(name => {
      const groupItems = groups[name];
      const sumScore = groupItems.reduce((acc, curr) => acc + curr.score, 0);
      groupItems.sort((a, b) => b.timestamp - a.timestamp); // Sort desc
      
      return {
        name: name,
        proposalCount: groupItems.length,
        avgScore: Math.round(sumScore / groupItems.length),
        lastInteraction: groupItems[0].timestamp,
        latestData: groupItems[0].data,
        items: groupItems
      };
    });

    groupList.sort((a, b) => b.lastInteraction - a.lastInteraction);
    setVendors(groupList);
  };

  // Load notes when viewing a proposal
  useEffect(() => {
    if (viewingProposal) {
        loadRelatedNotes();
    }
  }, [viewingProposal, user]);

  const loadRelatedNotes = () => {
      if (!viewingProposal || !user) return;
      const savedNotes = localStorage.getItem('procurement_notes_v2');
      if (savedNotes) {
          const allNotes: Note[] = JSON.parse(savedNotes);
          // Only show notes owned by current user for this proposal ID
          const linked = allNotes.filter(n => n.linkedProposalId === viewingProposal.id && n.ownerId === user.id);
          setRelatedNotes(linked);
      } else {
          setRelatedNotes([]);
      }
  };

  const handleSaveNote = (title: string, content: string): boolean => {
      if (!user || !viewingProposal) return false;

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
          labels: ['vendor-memo'],
          linkedProposalId: viewingProposal.id,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          ownerId: user.id
      };

      localStorage.setItem('procurement_notes_v2', JSON.stringify([newNote, ...currentNotes]));
      loadRelatedNotes();
      return true;
  };

  // Filter Logic (Includes searching by uploader name in Collective)
  const filteredVendors = vendors.filter(v => {
      const nameMatch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeTab === 'collective') {
          const uploaderMatch = v.items.some(i => {
              if (i.uploader) {
                  const fullName = `${i.uploader.firstName} ${i.uploader.lastName}`.toLowerCase();
                  return fullName.includes(searchTerm.toLowerCase());
              }
              return false;
          });
          return nameMatch || uploaderMatch;
      }
      return nameMatch;
  });

  const handlePublish = (item: HistoryItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) return;
      if (window.confirm("Publish to Collective Library? This will move it from your Personal Library to the shared team view.")) {
          libraryService.publishToCollective(item, user);
          
          // Clear current view
          setViewingProposal(null);
          setSelectedVendor(null);
          
          // Switch tab to show the user where it went
          setActiveTab('collective');
          alert("Successfully published! Switched to Collective Library view.");
      }
  };

  const handlePublishVendor = (vendor: VendorGroup) => {
      if (!user) return;
      if (window.confirm(`Publish ${vendor.name} and all its ${vendor.proposalCount} analyses to the Collective Library?`)) {
          libraryService.publishVendorGroup(vendor.items, user);
          
          setSelectedVendor(null);
          setActiveTab('collective');
          alert("Successfully published all analyses! Switched to Collective Library view.");
      }
  };

  const handleSaveToPersonal = (item: HistoryItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) return;
      libraryService.saveToPersonal(item, user);
      alert("Saved to Personal Library. You can now edit notes.");
  };

  const handleDelete = (item: HistoryItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) return;
      if (window.confirm("Delete this analysis?")) {
          try {
              if (activeTab === 'personal') {
                  libraryService.deleteFromPersonal(item.id);
              } else {
                  libraryService.deleteFromCollective(item.id, user);
              }
              
              loadVendors(); // Refresh main list data
              
              if (viewingProposal?.id === item.id) setViewingProposal(null);
              
              // Smart update of current selection without closing view
              if (selectedVendor) {
                  const updatedItems = selectedVendor.items.filter(i => i.id !== item.id);
                  if (updatedItems.length === 0) {
                      setSelectedVendor(null); // Close if empty
                  } else {
                      setSelectedVendor({
                          ...selectedVendor,
                          items: updatedItems,
                          proposalCount: updatedItems.length
                      });
                  }
              }

          } catch (err: any) {
              alert(err.message);
          }
      }
  };

  // --- Views ---

  // 1. Single Proposal View
  if (viewingProposal) {
      return (
          <div className="space-y-6">
              <button 
                  onClick={() => setViewingProposal(null)}
                  className="text-sm text-slate-500 hover:text-blue-600 flex items-center"
              >
                  ← Back to Vendor Profile
              </button>
              
              <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
                   <div>
                       <h2 className="font-bold text-slate-800">{viewingProposal.fileName}</h2>
                       {viewingProposal.uploader && activeTab === 'collective' && (
                           <p className="text-xs text-slate-500 flex items-center mt-1">
                               <User className="w-3 h-3 mr-1" />
                               Uploaded by {viewingProposal.uploader.firstName} {viewingProposal.uploader.lastName}
                           </p>
                       )}
                   </div>
                   <div className="flex space-x-3">
                       {activeTab === 'personal' && (
                           <button 
                                type="button"
                                onClick={(e) => handlePublish(viewingProposal, e)}
                                className="flex items-center space-x-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded hover:bg-indigo-100 transition-colors"
                           >
                                <Globe className="w-3 h-3 pointer-events-none" />
                                <span>Publish to Collective</span>
                           </button>
                       )}
                       {activeTab === 'collective' && (
                           <button 
                                type="button"
                                onClick={(e) => handleSaveToPersonal(viewingProposal, e)}
                                className="flex items-center space-x-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded hover:bg-green-100 transition-colors"
                           >
                                <Download className="w-3 h-3 pointer-events-none" />
                                <span>Save to Personal</span>
                           </button>
                       )}
                   </div>
              </div>

              <AnalysisView 
                  data={viewingProposal.data} 
                  // Allow saving notes if in Personal Library OR if viewing your own notes on a proposal
                  // Even if in collective, users might want to add a private memo about it
                  onSaveNote={activeTab === 'personal' ? handleSaveNote : undefined} 
              />
              
              {/* Display Linked Memos */}
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
      )
  }

  // 2. Vendor Detail View (List of proposals)
  if (selectedVendor) {
      const credibilityData = selectedVendor.latestData.vendor_credibility_summary as VendorCredibilityAnalysis | null;
      const latestInfo = selectedVendor.latestData.vendor_check_inputs;

      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <button 
                    onClick={() => setSelectedVendor(null)}
                    className="text-sm text-slate-500 hover:text-blue-600 flex items-center"
                >
                    ← Back to {activeTab === 'personal' ? 'Personal' : 'Collective'} Library
                </button>
                {activeTab === 'personal' && (
                    <button 
                        type="button"
                        onClick={() => handlePublishVendor(selectedVendor)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                    >
                        <Globe className="w-4 h-4 pointer-events-none" />
                        <span>Publish All to Collective</span>
                    </button>
                )}
              </div>

              {/* Vendor Header */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center space-x-4">
                          <div className={`p-4 rounded-full ${activeTab === 'personal' ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                              <Building2 className={`w-8 h-8 ${activeTab === 'personal' ? 'text-blue-600' : 'text-indigo-600'}`} />
                          </div>
                          <div>
                              <h1 className="text-3xl font-bold text-slate-800">{selectedVendor.name}</h1>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                                  {latestInfo.website && (
                                      <a href={latestInfo.website} target="_blank" rel="noreferrer" className="flex items-center hover:text-blue-600">
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Website
                                      </a>
                                  )}
                                  <span>•</span>
                                  <span>{selectedVendor.proposalCount} Analyses Available</span>
                              </div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-sm text-slate-500 uppercase font-semibold mb-1">Average Score</div>
                          <div className="text-4xl font-bold px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                              {selectedVendor.avgScore}
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Credibility Snapshot */}
                  <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                      <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                          <ShieldCheck className="w-5 h-5 mr-2 text-indigo-500" />
                          Credibility Snapshot
                      </h3>
                      {/* Reuse Credibility UI Logic roughly */}
                      {typeof credibilityData === 'object' && credibilityData ? (
                          <div className="space-y-4 text-sm">
                              <div className="flex items-start">
                                  <ExternalLink className="w-3 h-3 mt-1 mr-2 text-slate-400" />
                                  <div>
                                      <span className="font-medium text-slate-700">Website</span>
                                      <p className="text-xs text-slate-600">{credibilityData.website.notes}</p>
                                  </div>
                              </div>
                              <div className="flex items-start">
                                  <Linkedin className="w-3 h-3 mt-1 mr-2 text-slate-400" />
                                  <div>
                                      <span className="font-medium text-slate-700">LinkedIn</span>
                                      <p className="text-xs text-slate-600">{credibilityData.linkedin.notes}</p>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <p className="text-sm text-slate-500">No detailed credibility data.</p>
                      )}
                  </div>

                  {/* Proposals List */}
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-semibold text-slate-800">Available Analyses</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {selectedVendor.items.map(p => (
                              <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                  <div className="flex items-center space-x-4 overflow-hidden">
                                      <div className="bg-slate-100 p-2 rounded text-slate-500 flex-shrink-0">
                                          <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="min-w-0">
                                          <div className="font-medium text-slate-800 truncate">{p.fileName}</div>
                                          <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                              <Calendar className="w-3 h-3 mr-1" />
                                              {new Date(p.timestamp).toLocaleDateString('en-GB')}
                                              {p.uploader && activeTab === 'collective' && (
                                                  <span className="ml-2 pl-2 border-l border-slate-300 flex items-center">
                                                      <User className="w-3 h-3 mr-1" />
                                                      Uploaded by {p.uploader.firstName} {p.uploader.lastName}
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3 flex-shrink-0">
                                      <div className="text-right">
                                          <span className={`text-xs font-bold px-2 py-1 rounded ${p.score >= 80 ? 'text-green-700 bg-green-50' : p.score >= 60 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'}`}>
                                              Score: {p.score}
                                          </span>
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                           <button 
                                              type="button"
                                              onClick={() => setViewingProposal(p)}
                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                                              title="View"
                                           >
                                               <ArrowRight className="w-4 h-4 pointer-events-none" />
                                           </button>
                                           
                                           {activeTab === 'personal' && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => handlePublish(p, e)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                                                    title="Publish to Collective"
                                                >
                                                    <Globe className="w-4 h-4 pointer-events-none" />
                                                </button>
                                           )}

                                           {activeTab === 'collective' && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => handleSaveToPersonal(p, e)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                                                    title="Save to Personal"
                                                >
                                                    <Download className="w-4 h-4 pointer-events-none" />
                                                </button>
                                           )}

                                           <button 
                                              type="button"
                                              onClick={(e) => handleDelete(p, e)}
                                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                              title="Delete"
                                           >
                                               <Trash2 className="w-4 h-4 pointer-events-none" />
                                           </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // 3. Main Vendors List
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Vendor Directory</h2>
           <p className="text-slate-500">Access your personal analyses or the team's collective knowledge.</p>
        </div>
        
        {/* Library Tabs */}
        <div className="bg-slate-200 p-1 rounded-lg flex space-x-1">
            <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'personal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
            >
                Personal Library
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('collective')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'collective' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
            >
                Collective Library
            </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder={activeTab === 'collective' ? "Search vendor or uploader name..." : "Search vendor name..."}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
      </div>

      {vendors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {activeTab === 'personal' ? 'Your Personal Library is Empty' : 'Collective Library is Empty'}
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                  {activeTab === 'personal' 
                    ? "Upload proposals to start building your library. You can also save items from the Collective Library." 
                    : "No published analyses found. Share your work from your Personal Library to collaborate."}
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedVendor(vendor)}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full"
                  >
                      <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-lg transition-colors ${activeTab === 'personal' ? 'bg-blue-50 group-hover:bg-blue-600' : 'bg-indigo-50 group-hover:bg-indigo-600'}`}>
                              <Building2 className={`w-6 h-6 transition-colors ${activeTab === 'personal' ? 'text-blue-600 group-hover:text-white' : 'text-indigo-600 group-hover:text-white'}`} />
                          </div>
                          {/* Count Badge */}
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                              {vendor.proposalCount} File{vendor.proposalCount !== 1 ? 's' : ''}
                          </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-800 mb-1 truncate">{vendor.name}</h3>
                      
                      {/* Subtext */}
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 mb-4 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(vendor.lastInteraction).toLocaleDateString('en-GB')}
                        </p>
                        
                        {activeTab === 'collective' && vendor.items[0].uploader && (
                            <p className="text-xs text-indigo-600 mb-2 font-medium flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                Updated by {vendor.items[0].uploader.firstName}
                            </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                           <span className={`text-xs font-bold px-2 py-1 rounded ${vendor.avgScore >= 80 ? 'text-green-700 bg-green-50' : 'text-slate-700 bg-slate-100'}`}>
                               Avg Score: {vendor.avgScore}
                           </span>
                           <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default VendorsPage;
