
import { User, Colleague, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

const USERS_KEY = 'procurement_users';
const CURRENT_USER_KEY = 'procurement_current_user_id';
const OTP_KEY = 'procurement_active_otps';

interface OTPEntry {
    email: string;
    code: string;
    expiresAt: number;
}

const DEFAULT_USER: User = {
    id: 'default-axel-id',
    username: 'axel',
    firstName: 'Axel',
    lastName: 'User',
    email: 'axel@example.com',
    password: '0000',
    role: 'admin' // Axel is the Boss/Admin
};

export const authService = {
  // --- Auth ---
  login: (username: string, password: string): User | null => {
    // Ensure default user exists if no users
    authService.initDefaultUser();
    
    const users = authService.getUsers();
    // Login by username
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, user.id);
      return user;
    }
    return null;
  },

  // Legacy self-registration (logs user in immediately) - kept for internal consistency if needed
  register: (email: string, username: string, password: string, firstName: string, lastName: string): User => {
    return authService.adminCreateUser({ email, username, password, firstName, lastName, role: 'analyst' }, true);
  },

  // Admin creation method: Does NOT auto-login the new user unless autoLogin=true
  adminCreateUser: (userData: { email: string, username: string, password: string, firstName: string, lastName: string, role: UserRole }, autoLogin: boolean = false): User => {
      const users = authService.getUsers();
      if (users.find(u => u.email === userData.email)) {
        throw new Error("Email already registered");
      }
      if (users.find(u => u.username === userData.username)) {
        throw new Error("Username already taken");
      }
  
      const newUser: User = {
        id: uuidv4(),
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password, 
        role: userData.role
      };
  
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      if (autoLogin) {
          localStorage.setItem(CURRENT_USER_KEY, newUser.id);
      }

      return newUser;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const id = localStorage.getItem(CURRENT_USER_KEY);
    if (!id) return null;
    const users = authService.getUsers();
    return users.find(u => u.id === id) || null;
  },

  getUsers: (): User[] => {
    const stored = localStorage.getItem(USERS_KEY);
    let users: User[] = stored ? JSON.parse(stored) : [];
    
    // Inject default user ONLY if list is completely empty
    // This allows deleting 'axel' if other admins exist
    if (users.length === 0) {
        users.push(DEFAULT_USER);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    // MIGRATION: Ensure all users have a role (for users created before this update)
    const migratedUsers = users.map(u => {
        if (!u.role) {
            // Default legacy users to 'analyst', except axel who is 'admin'
            return { ...u, role: (u.username === 'axel' ? 'admin' : 'analyst') as UserRole };
        }
        return u;
    });

    // If migration happened, save it back
    if (JSON.stringify(users) !== JSON.stringify(migratedUsers)) {
        users = migratedUsers;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    return users;
  },

  initDefaultUser: () => {
      authService.getUsers(); // This triggers the default user check inside getUsers
  },

  // --- Password Reset & OTP ---
  
  requestPasswordReset: (email: string): string => {
      const users = authService.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
          throw new Error("No account found with this email address.");
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 10 minute expiry
      const otpsString = localStorage.getItem(OTP_KEY);
      let otps: OTPEntry[] = otpsString ? JSON.parse(otpsString) : [];
      
      // Remove old OTPs for this email
      otps = otps.filter(o => o.email !== email);
      
      otps.push({
          email: email,
          code: otpCode,
          expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      });
      
      localStorage.setItem(OTP_KEY, JSON.stringify(otps));

      return otpCode; // Return to caller to simulate sending email
  },

  verifyOTP: (email: string, code: string): boolean => {
      const otpsString = localStorage.getItem(OTP_KEY);
      if (!otpsString) return false;
      
      const otps: OTPEntry[] = JSON.parse(otpsString);
      const entry = otps.find(o => o.email === email && o.code === code);
      
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) return false;
      
      return true;
  },

  resetPassword: (email: string, code: string, newPassword: string) => {
      if (!authService.verifyOTP(email, code)) {
          throw new Error("Invalid or expired OTP code.");
      }

      const users = authService.getUsers();
      const userIndex = users.findIndex(u => u.email === email);
      
      if (userIndex === -1) throw new Error("User not found.");

      // Update password
      users[userIndex].password = newPassword;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Clean up used OTP
      const otpsString = localStorage.getItem(OTP_KEY);
      if (otpsString) {
          const otps: OTPEntry[] = JSON.parse(otpsString);
          const cleanedOtps = otps.filter(o => o.email !== email);
          localStorage.setItem(OTP_KEY, JSON.stringify(cleanedOtps));
      }
  },

  // --- Profile ---
  updateProfile: (userId: string, updates: Partial<User>) => {
    const users = authService.getUsers();
    
    // Check uniqueness if username is being updated
    if (updates.username) {
        if (users.find(u => u.username === updates.username && u.id !== userId)) {
            throw new Error("Username already taken.");
        }
    }

    // Check uniqueness if email is being updated
    if (updates.email) {
        if (users.find(u => u.email === updates.email && u.id !== userId)) {
            throw new Error("Email address already registered by another user.");
        }
    }

    const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  },

  updatePassword: (userId: string, currentPass: string, newPass: string) => {
    const users = authService.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user || user.password !== currentPass) {
        throw new Error("Invalid current password");
    }
    const updatedUsers = users.map(u => u.id === userId ? { ...u, password: newPass } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  },

  // --- Colleagues ---
  getColleagues: (userId: string): Colleague[] => {
    const key = `procurement_colleagues_${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  },

  addColleague: (userId: string, colleagueUsername: string) => {
    const users = authService.getUsers();
    const targetUser = users.find(u => u.username === colleagueUsername);
    
    if (!targetUser) throw new Error("User not found");
    if (targetUser.id === userId) throw new Error("Cannot add yourself");

    const colleagues = authService.getColleagues(userId);
    if (colleagues.find(c => c.userId === targetUser.id)) {
        throw new Error("Already a colleague");
    }

    const newColleague: Colleague = {
        userId: targetUser.id,
        username: targetUser.username,
        addedAt: Date.now()
    };
    
    localStorage.setItem(`procurement_colleagues_${userId}`, JSON.stringify([...colleagues, newColleague]));
  },

  removeColleague: (userId: string, colleagueId: string) => {
      const colleagues = authService.getColleagues(userId);
      const updated = colleagues.filter(c => c.userId !== colleagueId);
      localStorage.setItem(`procurement_colleagues_${userId}`, JSON.stringify(updated));
  },

  searchUsers: (query: string): User[] => {
    const users = authService.getUsers();
    return users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
  },

  deleteUser: (userId: string) => {
      const users = authService.getUsers();
      const updatedUsers = users.filter(u => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  }
};
