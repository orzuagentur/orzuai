export type MarketingTemplate = {
  id: string;
  name: string;
  subjectTemplate: string;
  headline: string;
  greeting: string;
  bodyTemplate: string;
  ctaLabel: string;
  ctaUrl: string;
  fromEmail: string;
  featureHighlights: string[];
  updatedAt: string | null;
};

export type MarketingBusinessRecipient = {
  id: string;
  businessName: string;
  email: string;
  ownerEmail: string | null;
  subscriptionPlan: string;
};

export type MarketingCampaignSummary = {
  id: string;
  name: string;
  subject: string;
  fromEmail: string;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  ignoredCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
};

export type MarketingCampaignDetail = MarketingCampaignSummary & {
  recipients: MarketingRecipientRow[];
};

export type MarketingRecipientRow = {
  id: string;
  recipientEmail: string;
  recipientName: string;
  businessId: string | null;
  businessName: string | null;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  openCount: number;
  clickCount: number;
  errorMessage: string | null;
};

export type MarketingAnalyticsOverview = {
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalIgnored: number;
  totalFailed: number;
  openRate: number;
  clickRate: number;
  campaigns: MarketingCampaignSummary[];
};
