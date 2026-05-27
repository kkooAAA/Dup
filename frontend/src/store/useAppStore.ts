import { create } from 'zustand';
import { User, AdAccount } from '../types';

interface AppState {
  user: User | null;
  adAccounts: AdAccount[];
  selectedAccount: AdAccount | null;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  draftName: string | null;
  setUser: (user: User | null) => void;
  setAdAccounts: (accounts: AdAccount[]) => void;
  setSelectedAccount: (account: AdAccount | null) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
  setDraftName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  adAccounts: [],
  selectedAccount: null,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  draftName: null,
  setUser: (user) => set({ user }),
  setAdAccounts: (accounts) => set({ adAccounts: accounts }),
  setSelectedAccount: (account) => set({ selectedAccount: account }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
  setDraftName: (draftName) => set({ draftName }),
}));
