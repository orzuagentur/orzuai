export function getStripeCustomerDashboardUrl(customerId: string): string {
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

export function getStripeSubscriptionDashboardUrl(subscriptionId: string): string {
  return `https://dashboard.stripe.com/subscriptions/${subscriptionId}`;
}

export function getStripeDashboardHomeUrl(): string {
  return "https://dashboard.stripe.com";
}
