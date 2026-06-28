type BookingConfirmationEmailParams = {
  businessName: string;
  pageTitle: string;
  customerName: string;
  slotLabel: string;
  resourceName?: string;
  timeZone: string;
};

export function renderBookingConfirmationEmail({
  businessName,
  pageTitle,
  customerName,
  slotLabel,
  resourceName,
}: BookingConfirmationEmailParams): { subject: string; text: string; html: string } {
  const subject = `Booking confirmed — ${pageTitle}`;

  const lines = [
    `Hi ${customerName},`,
    "",
    `Your appointment with ${businessName} is confirmed.`,
    "",
    `Service: ${pageTitle}`,
    `When: ${slotLabel}`,
    resourceName ? `With: ${resourceName}` : null,
    "",
    "If you need to reschedule, please contact us directly.",
    "",
    `— ${businessName}`,
  ].filter(Boolean);

  const text = lines.join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #111; max-width: 520px;">
      <p>Hi ${customerName},</p>
      <p>Your appointment with <strong>${businessName}</strong> is confirmed.</p>
      <table style="margin: 20px 0; border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 100px;">Service</td>
          <td style="padding: 8px 0; font-weight: 500;">${pageTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">When</td>
          <td style="padding: 8px 0; font-weight: 500;">${slotLabel}</td>
        </tr>
        ${
          resourceName
            ? `<tr>
          <td style="padding: 8px 0; color: #666;">With</td>
          <td style="padding: 8px 0; font-weight: 500;">${resourceName}</td>
        </tr>`
            : ""
        }
      </table>
      <p style="color: #666; font-size: 14px;">If you need to reschedule, please contact us directly.</p>
      <p style="margin-top: 24px; color: #666; font-size: 14px;">— ${businessName}</p>
    </div>
  `;

  return { subject, text, html };
}
