"use client";

import { useEffect, useState } from "react";
import { GlobeIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DASHBOARD_LOCALE_LABELS,
  DASHBOARD_LOCALE_STORAGE_KEY,
  SETTINGS_MESSAGES,
  type DashboardLocale,
} from "@/features/settings/constants";

const LOCALES = Object.keys(DASHBOARD_LOCALE_LABELS) as DashboardLocale[];

function readStoredLocale(): DashboardLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(DASHBOARD_LOCALE_STORAGE_KEY);

  if (stored === "en" || stored === "ru" || stored === "uz") {
    return stored;
  }

  return "en";
}

export function LanguageSettingsPanel() {
  const [locale, setLocale] = useState<DashboardLocale>("en");

  useEffect(() => {
    setLocale(readStoredLocale());
  }, []);

  function handleChange(nextLocale: DashboardLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem(DASHBOARD_LOCALE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    toast.success(SETTINGS_MESSAGES.languageSaved);
  }

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GlobeIcon className="size-4" />
          {SETTINGS_MESSAGES.languageTitle}
        </CardTitle>
        <CardDescription>{SETTINGS_MESSAGES.languageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="dashboard-locale">Language</Label>
        <select
          id="dashboard-locale"
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={locale}
          onChange={(event) =>
            handleChange(event.target.value as DashboardLocale)
          }
        >
          {LOCALES.map((entry) => (
            <option key={entry} value={entry}>
              {DASHBOARD_LOCALE_LABELS[entry]}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
