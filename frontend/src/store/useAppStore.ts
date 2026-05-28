import { create } from 'zustand';
import { User, AdAccount, Team } from '../types';

export interface Profile {
  id: string;
  name: string;
  teamId: string;
  _count?: { draftCampaigns: number };
}

interface AppState {
  user: User | null;
  team: Team | null;
  profile: Profile | null;
  profiles: Profile[];
  adAccounts: AdAccount[];
  selectedAccount: AdAccount | null;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  draftName: string | null;
  setUser: (user: User | null) => void;
  setTeam: (team: Team | null) => void;
  setProfile: (profile: Profile | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  setAdAccounts: (accounts: AdAccount[]) => void;
  setSelectedAccount: (account: AdAccount | null) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
  setDraftName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  team: null,
  profile: null,
  profiles: [],
  adAccounts: [],
  selectedAccount: null,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  draftName: null,
  setUser: (user) => set({ user }),
  setTeam: (team) => set({ team }),
  setProfile: (profile) => {
    set({ profile });
    if (profile) {
      localStorage.setItem('profileId', profile.id);
    } else {
      localStorage.removeItem('profileId');
    }
  },
  setProfiles: (profiles) => set({ profiles }),
  setAdAccounts: (accounts) => set({ adAccounts: accounts }),
  setSelectedAccount: (account) => set({ selectedAccount: account }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
  setDraftName: (draftName) => set({ draftName }),
}));
