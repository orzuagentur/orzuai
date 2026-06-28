type BookingActionEmailParams = {
  businessName: string;
  action: "updated" | "cancelled" | "confirmed";
  customerName: string;
  slotLabel: string;
  resourceName?: string;
  pageTitle?: string;
  note?: string;
};

export function renderBookingActionEmail({
  businessName,
  action,
  customerName,
  slotLabel,
  resourceName,
  pageTitle,
  note,
}: BookingActionEmailParams): { subject: string; text: string } {
  const actionLabel =
    action === "cancelled"
      ? "cancelled"
      : action === "updated"
        ? "updated"
        : "confirmed";

  const subject =
    action === "cancelled"
      ? `Booking cancelled — ${pageTitle ?? businessName}`
      : action === "updated"
        ? `Booking updated — ${pageTitle ?? businessName}`
        : `Booking confirmed — ${pageTitle ?? businessName}`;

  const lines = [
    `Hi ${customerName},`,
    "",
    `Your booking with ${businessName} has been ${actionLabel}.`,
    "",
    pageTitle ? `Service: ${pageTitle}` : null,
    resourceName ? `Resource: ${resourceName}` : null,
    `When: ${slotLabel}`,
    note ? `Note: ${note}` : null,
    "",
    "If you have questions, reply to this email.",
    "",
    `— ${businessName}`,
  ].filter(Boolean);

  return { subject, text: lines.join("\n") };
}
