export type DashboardCardPeriod = "all" | "week" | "month" | "year";

export type DashboardCardMetricKey =
  | "newMessages"
  | "totalMessages"
  | "aiResponses"
  | "newContacts"
  | "allContacts"
  | "qualifiedContacts"
  | "newOrders"
  | "inProgressOrders"
  | "doneOrders"
  | "openDeals"
  | "wonDeals"
  | "lostDeals";

export type DashboardCardSlotId =
  | "messages"
  | "contacts"
  | "orders"
  | "deals";

export type DashboardCardMetricValues = Record<DashboardCardMetricKey, number>;

export type DashboardActivityViewId =
  | "messageActivity"
  | "newClients"
  | "dealOutcomes"
  | "callVolume"
  | "orderVolume";

