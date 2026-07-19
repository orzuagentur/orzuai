"use client";

import { useEffect, useState } from "react";
import { Settings2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LEGAL_ROUTES } from "@/constants/routes";
import {
  COOKIE_CATEGORY_COPY,
  DEFAULT_COOKIE_PREFERENCES,
  readCookieConsent,
  writeCookieConsent,
  type CookiePreferences,
} from "@/features/cookies/consent";
import { cn } from "@/lib/utils";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState<CookiePreferences>(DEFAULT_COOKIE_PREFERENCES);

  useEffect(() => {
    const existing = readCookieConsent();
    if (!existing) {
      setVisible(true);
      return;
    }
    setDraft(existing.preferences);
  }, []);

  function save(preferences: CookiePreferences) {
    writeCookieConsent(preferences);
    setDraft(preferences);
    setVisible(false);
    setManageOpen(false);
  }

  function acceptAll() {
    save({ necessary: true, analytics: true, preferences: true });
  }

  function rejectOptional() {
    save({ necessary: true, analytics: false, preferences: false });
  }

  function saveCustom() {
    save({
      necessary: true,
      analytics: draft.analytics,
      preferences: draft.preferences,
    });
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[60] w-[min(100%-2rem,24rem)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(24,24,27,0.16)]",
      )}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id="cookie-consent-title" className="text-sm font-semibold text-zinc-900">
            Cookie preferences
          </p>
          <p id="cookie-consent-desc" className="mt-1 text-xs leading-5 text-zinc-600">
            Choose what we may store and measure. We only use categories you
            enable.{" "}
            <a
              href={LEGAL_ROUTES.privacy}
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={rejectOptional}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Close and keep necessary cookies only"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {manageOpen ? (
        <div className="mt-3 space-y-2">
          {(Object.keys(COOKIE_CATEGORY_COPY) as Array<keyof typeof COOKIE_CATEGORY_COPY>).map(
            (id) => {
              const copy = COOKIE_CATEGORY_COPY[id];
              const locked = Boolean(copy.locked);
              const checked =
                id === "necessary" ? true : Boolean(draft[id as "analytics" | "preferences"]);

              return (
                <div
                  key={id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900">{copy.title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                      {copy.description}
                    </p>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={(next) => {
                      if (locked || id === "necessary") return;
                      setDraft((current) => ({
                        ...current,
                        [id]: next,
                      }));
                    }}
                    aria-label={copy.title}
                  />
                </div>
              );
            },
          )}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="h-8" onClick={acceptAll}>
          Accept all
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={rejectOptional}
        >
          Necessary only
        </Button>
        {manageOpen ? (
          <Button type="button" size="sm" className="h-8" onClick={saveCustom}>
            Save choices
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5"
            onClick={() => setManageOpen(true)}
          >
            <Settings2Icon className="size-3.5" />
            Manage
          </Button>
        )}
      </div>
    </div>
  );
}
