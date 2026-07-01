"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ContactSegment, CrmEntityTab, LeadSegment } from "@/types/contact.types";
import type { CrmDealsPageData } from "@/types/crm-deal.types";
import type { LeadsPageData, UnifiedContactsPageData } from "@/types/contact.types";

export type ContactsChromeConfig = {
  activeTab: CrmEntityTab;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  activeView?: "list" | "pipeline";
  onViewChange?: (view: "list" | "pipeline") => void;
  activeSegment?: ContactSegment;
  onSegmentChange?: (segment: ContactSegment) => void;
  activeLeadSegment?: LeadSegment;
  onLeadSegmentChange?: (segment: LeadSegment) => void;
  dealsView?: "kanban" | "list";
  onDealsViewChange?: (view: "kanban" | "list") => void;
  onNewDeal?: () => void;
  crmListData?: UnifiedContactsPageData | LeadsPageData | null;
  crmDealsData?: CrmDealsPageData | null;
};

type ContactsChromeContextValue = {
  chrome: ContactsChromeConfig | null;
  setChrome: (chrome: ContactsChromeConfig | null) => void;
};

export const ContactsChromeContext =
  createContext<ContactsChromeContextValue | null>(null);

function chromePrimitivesEqual(
  a: ContactsChromeConfig,
  b: ContactsChromeConfig,
): boolean {
  return (
    a.activeTab === b.activeTab &&
    a.searchQuery === b.searchQuery &&
    a.searchPlaceholder === b.searchPlaceholder &&
    a.activeView === b.activeView &&
    a.activeSegment === b.activeSegment &&
    a.activeLeadSegment === b.activeLeadSegment &&
    a.dealsView === b.dealsView
  );
}

export function ContactsChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<ContactsChromeConfig | null>(null);

  const setChrome = useCallback((next: ContactsChromeConfig | null) => {
    setChromeState((prev) => {
      if (prev === null && next === null) {
        return prev;
      }

      if (prev === null || next === null) {
        return next;
      }

      if (!chromePrimitivesEqual(prev, next)) {
        return next;
      }

      if (
        prev.onSearchChange !== next.onSearchChange ||
        prev.onViewChange !== next.onViewChange ||
        prev.onSegmentChange !== next.onSegmentChange ||
        prev.onLeadSegmentChange !== next.onLeadSegmentChange ||
        prev.onDealsViewChange !== next.onDealsViewChange ||
        prev.onNewDeal !== next.onNewDeal
      ) {
        return next;
      }

      return prev;
    });
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
    }),
    [chrome, setChrome],
  );

  return (
    <ContactsChromeContext.Provider value={value}>
      {children}
    </ContactsChromeContext.Provider>
  );
}

export function useOptionalContactsChrome() {
  const context = useContext(ContactsChromeContext);
  return context?.chrome ?? null;
}

export function useContactsChromeRegistration(config: ContactsChromeConfig | null) {
  const context = useContext(ContactsChromeContext);
  const setChromeRef = useRef(context?.setChrome);
  setChromeRef.current = context?.setChrome;

  const enabled = config !== null && typeof config.onSearchChange === "function";

  const activeTab = config?.activeTab ?? "contacts";
  const searchQuery = config?.searchQuery ?? "";
  const searchPlaceholder = config?.searchPlaceholder;
  const activeView = config?.activeView ?? "list";
  const activeSegment = config?.activeSegment ?? "all";
  const activeLeadSegment = config?.activeLeadSegment ?? "all_leads";
  const dealsView = config?.dealsView ?? "kanban";
  const onSearchChange = config?.onSearchChange;
  const onViewChange = config?.onViewChange;
  const onSegmentChange = config?.onSegmentChange;
  const onLeadSegmentChange = config?.onLeadSegmentChange;
  const onDealsViewChange = config?.onDealsViewChange;
  const onNewDeal = config?.onNewDeal;
  const crmListData = config?.crmListData;
  const crmDealsData = config?.crmDealsData;

  useEffect(() => {
    const setChrome = setChromeRef.current;

    if (!setChrome) {
      return;
    }

    if (!enabled || !onSearchChange) {
      setChrome(null);
      return;
    }

    setChrome({
      activeTab,
      searchQuery,
      onSearchChange,
      searchPlaceholder,
      activeView,
      onViewChange,
      activeSegment,
      onSegmentChange,
      activeLeadSegment,
      onLeadSegmentChange,
      dealsView,
      onDealsViewChange,
      onNewDeal,
      crmListData,
      crmDealsData,
    });

    return () => {
      setChrome(null);
    };
  }, [
    activeLeadSegment,
    activeSegment,
    activeTab,
    activeView,
    dealsView,
    enabled,
    onDealsViewChange,
    onLeadSegmentChange,
    onNewDeal,
    onSearchChange,
    onSegmentChange,
    onViewChange,
    crmListData,
    crmDealsData,
    searchPlaceholder,
    searchQuery,
  ]);
}
