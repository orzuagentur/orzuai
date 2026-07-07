export type EmailTemplateRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  subjectTemplate: string;
  bodyHtmlTemplate: string | null;
  fromEmail: string | null;
  isActive: boolean;
  isSystem: boolean;
  sendCount: number;
  deliveredCount: number;
  failedCount: number;
  updatedAt: string;
};

export type EmailSendLogRow = {
  id: string;
  templateId: string | null;
  templateName: string | null;
  resendId: string | null;
  toEmail: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type EmailCenterStats = {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
};
