import {
  renderEmailHeading,
  renderEmailParagraph,
  renderInfoBox,
  renderPrimaryButton,
} from "../components";
import { APP_ORIGIN } from "../../../constants/app-origin";
import { renderBaseEmailLayout } from "./base-layout";

type SubscriptionBillingEmailParams = {
  planLabel: string;
  amountLabel?: string | null;
  billingPeriodLabel?: string | null;
  previousPlanLabel?: string | null;
};

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatStripeMoney(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (amountCents == null || !currency?.trim()) {
    return null;
  }

  return formatAmount(amountCents, currency);
}

export function renderSubscriptionPurchasedEmail(
  params: SubscriptionBillingEmailParams,
): { subject: string; html: string } {
  const subject = "Your OrzuX subscription is active";
  const amountLine = params.amountLabel
    ? `<p style="margin:0 0 8px;"><strong>Amount:</strong> ${params.amountLabel}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("Subscription active")}
    ${renderEmailParagraph(`Thank you for subscribing to the ${params.planLabel} plan on OrzuX.`)}
    ${renderInfoBox(`
      <p style="margin:0 0 8px;"><strong>Plan:</strong> ${params.planLabel}</p>
      ${amountLine}
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/billing`, "Manage billing")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: `Your ${params.planLabel} subscription is now active.`,
      title: subject,
      bodyHtml,
    }),
  };
}

export function renderSubscriptionRenewedEmail(
  params: SubscriptionBillingEmailParams,
): { subject: string; html: string } {
  const subject = "Your OrzuX subscription was renewed";
  const amountLine = params.amountLabel
    ? `<p style="margin:0 0 8px;"><strong>Charged:</strong> ${params.amountLabel}</p>`
    : "";
  const periodLine = params.billingPeriodLabel
    ? `<p style="margin:0;"><strong>Period:</strong> ${params.billingPeriodLabel}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("Subscription renewed")}
    ${renderEmailParagraph(`Your ${params.planLabel} subscription payment was processed successfully.`)}
    ${renderInfoBox(`
      <p style="margin:0 0 8px;"><strong>Plan:</strong> ${params.planLabel}</p>
      ${amountLine}
      ${periodLine}
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/billing`, "View invoice")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: `Your ${params.planLabel} subscription was renewed.`,
      title: subject,
      bodyHtml,
    }),
  };
}

export function renderSubscriptionPlanChangedEmail(
  params: SubscriptionBillingEmailParams,
): { subject: string; html: string } {
  const subject = "Your OrzuX plan was updated";
  const previousLine = params.previousPlanLabel
    ? `<p style="margin:0 0 8px;"><strong>Previous plan:</strong> ${params.previousPlanLabel}</p>`
    : "";

  const bodyHtml = `
    ${renderEmailHeading("Plan updated")}
    ${renderEmailParagraph("Your OrzuX subscription plan has been changed.")}
    ${renderInfoBox(`
      ${previousLine}
      <p style="margin:0;"><strong>New plan:</strong> ${params.planLabel}</p>
    `)}
    ${renderPrimaryButton(`${APP_ORIGIN}/dashboard/billing`, "Manage subscription")}
  `;

  return {
    subject,
    html: renderBaseEmailLayout({
      previewText: `Your plan is now ${params.planLabel}.`,
      title: subject,
      bodyHtml,
    }),
  };
}
