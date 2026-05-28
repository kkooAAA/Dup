export interface User {
  id: string;
  facebookId?: string | null;
  name: string;
  email: string;
  role?: string;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  inviteCode?: string;
  ownerId: string;
  members: TeamMember[];
  memberCount: number;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export interface AdAccount {
  id: string;
  adaccount_id: string;
  name: string;
  currency: string;
  timezone_name: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time?: string;
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  targeting: any;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: {
    id: string;
  };
}

export interface DuplicateJob {
  id: string;
  status: string;
  type: string;
  sourceId: string;
  targetId?: string;
  createdAt: string;
}
