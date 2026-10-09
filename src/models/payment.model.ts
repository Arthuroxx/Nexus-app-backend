export interface CheckoutRequest {
  userId?: string;
  id?: string;
  email?: string;
  amount?: number;
  currency?: string;
  planId?: string;
}

export interface ReconcileRequest {
  paymentId?: string;
}

export interface GrantMembershipRequest {
  userId?: string;
  email?: string;
  days?: number;
}

export interface MercadoPagoNotification {
  type?: string;
  id?: string | number;
  data?: { id?: string | number; payment_id?: string | number };
}

export interface PaymentReference {
  metadata?: Record<string, unknown>;
  external_reference?: string;
  payer?: { email?: string };
}

export interface Transaction {
  id: string;
  paymentId: string | number | undefined;
  email: string | undefined;
  amount: number | undefined;
  currency: string;
  status: string | undefined;
  createdAt: Date;
}
