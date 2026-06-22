"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { DashboardUserProfile } from "@/types/dashboard.types";

const DashboardProfileContext = createContext<DashboardUserProfile | null>(null);

export function DashboardProfileProvider({
  userProfile,
  children,
}: {
  userProfile: DashboardUserProfile;
  children: ReactNode;
}) {
  return (
    <DashboardProfileContext.Provider value={userProfile}>
      {children}
    </DashboardProfileContext.Provider>
  );
}

export function useDashboardProfile() {
  return useContext(DashboardProfileContext);
}
