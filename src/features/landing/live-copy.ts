import { getLandingCopy, type LandingLocale } from "@/features/landing/i18n";

export type LandingArchitectureNode = {
  id: string;
  label: string;
  caption: string;
};

export type LandingArchitectureCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  nodes: LandingArchitectureNode[];
};

export function getLandingArchitecture(locale: LandingLocale): LandingArchitectureCopy {
  return getLandingCopy(locale).architecture;
}
