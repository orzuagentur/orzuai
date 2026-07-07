import {
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
  renderPrimaryButton,
} from "../components";
import { APP_ORIGIN } from "../../../constants/app-origin";
import { renderBaseEmailLayout } from "./base-layout";
import { formatStripeMoney } from "./subscription-billing-email";

type PaymentFailedEmailParams = {
  planLabel: string;
  amountLabel?: string | null;
  failureMessage?: string | null;
  paymentMethodLabel: string;
};

type CardExpiringEmailParams = {
  cardLabel: string;
  expiryLabel: string;
  planLabel?: string | null;
};

export function renderPaymentCardFailedEmail(
  params: PaymentFailedEmailParams,
): { subject: string; html: string } {
  const subject = "Action required: your OrzuX payment failed";
  const reasonLine = params.failureMessage?.trim()
    ? `<p style="margin:0 0 8px;"><strong>Reason:</strong> ${params.failureMessage.trim()}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("Card payment failed")}
    ${renderEmailParagraph(`We could not charge your ${params.planLabel} subscription to your card. Please update your payment method to keep your OrzuX account active.`)}
    ${renderInfoBox(`
      <p style="margin:0 0 8px;"><strong>Plan:</strong> ${params.planLabel}</p>
      ${params.amountLabel ? `<p style="margin:0 0 8px;"><strong>Amount due:</strong> ${params.amountLabel}</p>` : ""}
      <p style="margin:0 0 8px;"><strong>Payment method:</strong> ${params.paymentMethodLabel}</p>
      ${reasonLine}
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/billing`, "Update payment method")}
    ${renderEmailParagraph("If you already updated your card, you can ignore this message.")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: "Your OrzuX card payment failed.",
      title: subject,
      bodyHtml,
    }),
  };
}

export function renderPaymentBankFailedEmail(
  params: PaymentFailedEmailParams,
): { subject: string; html: string } {
  const subject = "Action required: your OrzuX bank payment failed";
  const reasonLine = params.failureMessage?.trim()
    ? `<p style="margin:0 0 8px;"><strong>Reason:</strong> ${params.failureMessage.trim()}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("Bank payment failed")}
    ${renderEmailParagraph(`Your bank debit or transfer for the ${params.planLabel} plan could not be completed. Please review your billing details or use another payment method.`)}
    ${renderInfoBox(`
      <p style="margin:0 0 8px;"><strong>Plan:</strong> ${params.planLabel}</p>
      ${params.amountLabel ? `<p style="margin:0 0 8px;"><strong>Amount due:</strong> ${params.amountLabel}</p>` : ""}
      <p style="margin:0 0 8px;"><strong>Payment method:</strong> ${params.paymentMethodLabel}</p>
      ${reasonLine}
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/billing`, "Review billing")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: "Your OrzuX bank payment failed.",
      title: subject,
      bodyHtml,
    }),
  };
}

export function renderCardExpiringEmail(
  params: CardExpiringEmailParams,
): { subject: string; html: string } {
  const subject = "Your OrzuX payment card is expiring soon";
  const planLine = params.planLabel?.trim()
    ? `<p style="margin:0 0 8px;"><strong>Plan:</strong> ${params.planLabel.trim()}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("Payment card expiring")}
    ${renderEmailParagraph("The card on your OrzuX account is expiring soon. Update it now to avoid interruption to your subscription.")}
    ${renderInfoBox(`
      ${planLine}
      <p style="margin:0 0 8px;"><strong>Card:</strong> ${params.cardLabel}</p>
      <p style="margin:0;"><strong>Expires:</strong> ${params.expiryLabel}</p>
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/billing`, "Update card")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: `Your ${params.cardLabel} expires on ${params.expiryLabel}.`,
      title: subject,
      bodyHtml,
    }),
  };
}

export { formatStripeMoney };
