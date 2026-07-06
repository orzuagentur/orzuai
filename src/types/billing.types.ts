import type { ActivityDataPoint } from "@/types/dashboard.types";

export type BillingPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type BillingInvoiceItem = {
  id: string;
  number: string | null;
  status: string;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
};

export type BillingUsagePoint = {
  date: string;
  label: string;
  value: number;
};

export type WhatsAppBillingData = {
  isConnected: boolean;
  phoneNumber: string | null;
  displayName: string | null;
  connectedAt: string | null;
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
  messagesLast30Days: BillingUsagePoint[];
  estimatedMonthlySpendCents: number | null;
};

export type TwilioNumberBillingItem = {
  id: string;
  phoneNumber: string;
  phoneSid: string;
  countryCode: string;
  countryLabel: string;
  monthlyPriceCents: number;
  status: "active" | "canceled";
  createdAt: string;
};

export type TwilioBillingData = {
  isConnected: boolean;
  connectionStatus: string;
  accountFriendlyName: string | null;
  activePhoneNumber: string | null;
  numbers: TwilioNumberBillingItem[];
  voiceMinutesLast30Days: number;
  smsCountLast30Days: number;
  callVolume: ActivityDataPoint[];
  smsVolume: ActivityDataPoint[];
  monthlyNumberSpendCents: number;
  connectUrl: string;
  isConnectConfigured: boolean;
};

export type BillingOverviewData = {
  hasBusiness: boolean;
  stripeConfigured: boolean;
  subscriptionStatus: string;
  currentPlanLabel: string;
  hasStripeCustomer: boolean;
  hasActivePaidSubscription: boolean;
  paymentMethod: BillingPaymentMethod | null;
  recentInvoices: BillingInvoiceItem[];
};
