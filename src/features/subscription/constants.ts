export const SUBSCRIPTION_MESSAGES = {
  pageTitle: "Subscription & Billing",
  pageDescription:
    "Choose a plan, add a payment method, and manage invoices through Stripe.",
  currentPlan: "Current plan",
  status: "Status",
  usage: "AI usage this month",
  upgrade: "Upgrade plan",
  manageBilling: "Manage payment method & invoices",
  stripeMissing:
    "Stripe is not configured yet. Add STRIPE_SECRET_KEY and price IDs to enable billing.",
  checkoutFailed: "Unable to start checkout. Please try again.",
  portalFailed: "Unable to open billing portal. Please try again.",
  freePlanNote: "Free plan — no payment method required.",
  successTitle: "Subscription updated",
  successDescription: "Your plan changes may take a moment to appear.",
  canceledTitle: "Checkout canceled",
  canceledDescription: "No charges were made.",
  addonFailed: "Unable to add this add-on. Please try again.",
  addonRequiresPaidPlan: "Upgrade to a paid plan before adding add-ons.",
  addonAddedTitle: "Add-on added",
  addonAddedDescription: "Your subscription was updated. Limits refresh shortly.",
  addonActiveLabel: "Active",
} as const;
