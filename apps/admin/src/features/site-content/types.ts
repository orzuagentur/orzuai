export type SiteDocCollection = "landing" | "docs" | "faq";
export type SiteDocLocale = "en" | "ru" | "uz";

export type SiteDocumentSection = {
  heading: string;
  body: string;
  bulletsText?: string;
};

export type SiteDocumentRecord = {
  id: string;
  collection: SiteDocCollection;
  docKey: string;
  locale: SiteDocLocale;
  title: string;
  summary: string;
  body: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
};

export type SaveSiteDocumentInput = {
  id?: string;
  collection: SiteDocCollection;
  docKey: string;
  locale: SiteDocLocale;
  title: string;
  summary: string;
  body: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  published: boolean;
};
