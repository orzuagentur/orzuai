export type DocsSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type DocsArticle = {
  slug: string;
  title: string;
  summary: string;
  updatedLabel: string;
  sections: DocsSection[];
  relatedSlugs?: string[];
};
