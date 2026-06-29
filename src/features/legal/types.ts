export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalPageRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  footerLabel: string;
  sections: LegalSection[];
  sortOrder: number;
  published: boolean;
  showInFooter: boolean;
  updatedAt: string;
};

export type LegalFooterLink = {
  href: string;
  label: string;
};
