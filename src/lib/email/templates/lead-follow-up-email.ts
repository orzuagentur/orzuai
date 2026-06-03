type LeadFollowUpEmailParams = {
  businessName: string;
  recipientName: string;
  message: string;
};

export function renderLeadFollowUpEmail({
  businessName,
  recipientName,
  message,
}: LeadFollowUpEmailParams): { subject: string; html: string } {
  const safeMessage = message.replace(/\n/g, "<br />");

  return {
    subject: `Thank you for contacting ${businessName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
        <p>Hi ${recipientName},</p>
        <p>${safeMessage}</p>
        <p style="color: #666; font-size: 14px;">— ${businessName}</p>
      </div>
    `,
  };
}
