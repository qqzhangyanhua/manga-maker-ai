export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  verified: boolean | null;
  created_at: string;
  role: string | null;
  status: string | null;
  credits: number;
  total_credits_used: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance: number;
  action: string;
  description: string | null;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}
