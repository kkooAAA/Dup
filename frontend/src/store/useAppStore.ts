import { create } from 'zustand';
import { User, AdAccount } from '../types';

interface AppState {
  user: User | null;
  adAccounts: AdAccount[];
  selectedAccount: AdAccount | null;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setAdAccounts: (accounts: AdAccount[]) => void;
  setSelectedAccount: (account: AdAccount | null) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  adAccounts: [],
  selectedAccount: null,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  setUser: (user) => set({ user }),
  setAdAccounts: (accounts) => set({ adAccounts: accounts }),
  setSelectedAccount: (account) => set({ selectedAccount: account }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
}));
