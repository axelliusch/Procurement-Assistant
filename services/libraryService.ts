
import { HistoryItem, User } from '../types';

const PERSONAL_KEY = 'procurement_history';
const COLLECTIVE_KEY = 'procurement_collective_library';

export const libraryService = {
  // --- Personal Library ---
  getPersonalLibrary: (userId: string): HistoryItem[] => {
    const data = localStorage.getItem(PERSONAL_KEY);
    if (!data) return [];
    const allItems: HistoryItem[] = JSON.parse(data);
    // Personal library filters by ownerId
    return allItems.filter(item => item.ownerId === userId);
  },

  addToPersonal: (item: HistoryItem) => {
    const data = localStorage.getItem(PERSONAL_KEY);
    const allItems: HistoryItem[] = data ? JSON.parse(data) : [];
    
    // Check if exists to avoid duplicates
    if (!allItems.find(i => i.id === item.id)) {
        allItems.unshift(item);
        localStorage.setItem(PERSONAL_KEY, JSON.stringify(allItems));
    }
  },

  deleteFromPersonal: (itemId: string) => {
    const data = localStorage.getItem(PERSONAL_KEY);
    if (!data) return;
    const allItems: HistoryItem[] = JSON.parse(data);
    const updated = allItems.filter(i => i.id !== itemId);
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(updated));
  },

  // --- Collective Library ---
  getCollectiveLibrary: (): HistoryItem[] => {
    const data = localStorage.getItem(COLLECTIVE_KEY);
    return data ? JSON.parse(data) : [];
  },

  publishToCollective: (item: HistoryItem, user: User) => {
    // 1. Get Collective Data
    const cData = localStorage.getItem(COLLECTIVE_KEY);
    const cItems: HistoryItem[] = cData ? JSON.parse(cData) : [];

    // 2. Prepare Item (Attach Uploader Info if missing)
    const itemToPublish: HistoryItem = {
        ...item,
        uploader: {
            id: user.id,
            firstName: user.firstName || user.username,
            lastName: user.lastName || ''
        },
        isPublished: true
    };

    // 3. Update or Add to Collective
    // If ID exists, update it (to capture new notes/data), otherwise add top
    const existingIndex = cItems.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
        cItems[existingIndex] = itemToPublish;
    } else {
        cItems.unshift(itemToPublish);
    }
    localStorage.setItem(COLLECTIVE_KEY, JSON.stringify(cItems));

    // 4. Remove from Personal
    libraryService.deleteFromPersonal(item.id);
  },

  publishVendorGroup: (items: HistoryItem[], user: User) => {
      items.forEach(item => {
          libraryService.publishToCollective(item, user);
      });
  },

  deleteFromCollective: (itemId: string, user: User) => {
    const cData = localStorage.getItem(COLLECTIVE_KEY);
    if (!cData) return;
    let cItems: HistoryItem[] = JSON.parse(cData);

    const target = cItems.find(i => i.id === itemId);
    if (!target) return;

    // Only Admin or Original Uploader can delete
    if (user.role === 'admin' || target.uploader?.id === user.id) {
        cItems = cItems.filter(i => i.id !== itemId);
        localStorage.setItem(COLLECTIVE_KEY, JSON.stringify(cItems));
    } else {
        throw new Error("Permission denied: You can only delete items you uploaded.");
    }
  },

  // Import from Collective to Personal (Save)
  saveToPersonal: (item: HistoryItem, user: User) => {
      // Create a copy for the personal library associated with the CURRENT user
      const personalCopy: HistoryItem = {
          ...item,
          ownerId: user.id, // Transfer ownership to current user in their personal view
          // We keep uploader info to show provenance, or clear it if we want it to look "new"
          // Requirement says "Saved... including all its analyses". 
      };
      libraryService.addToPersonal(personalCopy);
  }
};
