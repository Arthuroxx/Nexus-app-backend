import type { AppUser } from './user.model';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  id: string;
  user_id: string;
  user?: AppUser;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  payment_id: string | null;
  created_at: string;
  plan_id?: string | null;
  plan?: string | null;
}

export interface SubscriptionStatusRow {
  status: SubscriptionStatus;
  start_date: string | null;
  end_date: string | null;
  payment_id: string | null;
}

export interface SubscriptionStatusView {
  price: number;
  status: 'Active' | 'Inactive';
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  paymentId: string | null;
  plan?: string | null;
}
