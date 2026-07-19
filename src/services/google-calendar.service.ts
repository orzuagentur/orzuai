import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  GOOGLE_CALENDAR_INTEGRATION_HREF,
  GOOGLE_CALENDAR_MESSAGES,
} from "@/features/google-calendar/constants";
import {
  fetchPrimaryGoogleCalendar,
  listGoogleCalendarEvents,
} from "@/lib/google-calendar/client";
import {
  buildGoogleCalendarAuthUrl,
  createGoogleCalendarOAuthState,
  exchangeGoogleCalendarCode,
  fetchGoogleAccountEmail,
  getGoogleCalendarRedirectUri,
  refreshGoogleCalendarAccessToken,
} from "@/lib/google-calendar/oauth";
import { hasGoogleOAuthEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  deleteIntegrationSecret,
  resolveIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
import type { GoogleCalendarConnection } from "@/types/database.types";
import type {
  GoogleCalendarConnectConfig,
  GoogleCalendarConnectionData,
  GoogleCalendarEventsResult,
} from "@/types/google-calendar.types";

function revalidateGoogleCalendarPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.calendar);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(GOOGLE_CALENDAR_INTEGRATION_HREF);
  revalidatePath(DASHBOARD_ROUTES.marketplace);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function mapGoogleCalendarConnection(
  row: GoogleCalendarConnection,
): GoogleCalendarConnectionData {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.google_calendar_status,
    googleAccountEmail: row.google_account_email,
    calendarId: row.calendar_id,
    calendarSummary: row.calendar_summary,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  };
}

export async function getGoogleCalendarConnection(
  businessId: string,
): Promise<GoogleCalendarConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapGoogleCalendarConnection(data) : null;
}

export async function isGoogleCalendarConnected(
  businessId: string,
): Promise<boolean> {
  const connection = await getGoogleCalendarConnection(businessId);
  return connection?.status === "connected";
}

export function getGoogleCalendarConnectConfig(): GoogleCalendarConnectConfig {
  const isConfigured = hasGoogleOAuthEnv();
  const redirectUri = getGoogleCalendarRedirectUri();

  return {
    isConfigured,
    redirectUri,
    connectUrl: "/api/integrations/google-calendar/connect",
  };
}

export async function buildGoogleCalendarOAuthUrlForBusiness(
  businessId: string,
): Promise<string> {
  if (!hasGoogleOAuthEnv()) {
    throw new Error(GOOGLE_CALENDAR_MESSAGES.notConfiguredTitle);
  }

  const state = createGoogleCalendarOAuthState(businessId);
  return buildGoogleCalendarAuthUrl(state);
}

async function getValidAccessToken(
  connection: GoogleCalendarConnection,
): Promise<string | null> {
  const admin = createAdminClient();
  const accessToken = await resolveIntegrationSecret(admin, {
    businessId: connection.business_id,
    kind: "GOOGLE_CALENDAR_ACCESS_TOKEN",
    secretKeyName: connection.access_token_secret_key_name,
    legacyValue: connection.access_token,
    onMigrated: async (secretKeyName) => {
      await admin
        .from("google_calendar_connections")
        .update({
          access_token: null,
          access_token_secret_key_name: secretKeyName,
        })
        .eq("id", connection.id);
    },
  });

  if (!accessToken) {
    return null;
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : null;

  const isExpired =
    expiresAt !== null && expiresAt <= Date.now() + 60_000;

  if (!isExpired) {
    return accessToken;
  }

  const refreshToken = await resolveIntegrationSecret(admin, {
    businessId: connection.business_id,
    kind: "GOOGLE_CALENDAR_REFRESH_TOKEN",
    secretKeyName: connection.refresh_token_secret_key_name,
    legacyValue: connection.refresh_token,
    onMigrated: async (secretKeyName) => {
      await admin
        .from("google_calendar_connections")
        .update({
          refresh_token: null,
          refresh_token_secret_key_name: secretKeyName,
        })
        .eq("id", connection.id);
    },
  });

  if (!refreshToken) {
    return null;
  }

  try {
    const refreshed = await refreshGoogleCalendarAccessToken(refreshToken);
    const nextRefreshToken = refreshed.refreshToken ?? refreshToken;
    const [accessSecretKeyName, refreshSecretKeyName] = await Promise.all([
      storeIntegrationSecret(admin, {
        businessId: connection.business_id,
        kind: "GOOGLE_CALENDAR_ACCESS_TOKEN",
        value: refreshed.accessToken,
      }),
      storeIntegrationSecret(admin, {
        businessId: connection.business_id,
        kind: "GOOGLE_CALENDAR_REFRESH_TOKEN",
        value: nextRefreshToken,
      }),
    ]);

    await admin
      .from("google_calendar_connections")
      .update({
        access_token: null,
        access_token_secret_key_name: accessSecretKeyName,
        refresh_token: null,
        refresh_token_secret_key_name: refreshSecretKeyName,
        token_expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function getGoogleCalendarAccessToken(
  connection: GoogleCalendarConnection,
): Promise<string | null> {
  return getValidAccessToken(connection);
}

export async function completeGoogleCalendarOAuth(
  businessId: string,
  code: string,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv() || !hasGoogleOAuthEnv()) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.oauthError };
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code);
    const [email, primaryCalendar] = await Promise.all([
      fetchGoogleAccountEmail(tokens.accessToken),
      fetchPrimaryGoogleCalendar(tokens.accessToken),
    ]);

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const [accessSecretKeyName, refreshSecretKeyName] = await Promise.all([
      storeIntegrationSecret(admin, {
        businessId,
        kind: "GOOGLE_CALENDAR_ACCESS_TOKEN",
        value: tokens.accessToken,
      }),
      storeIntegrationSecret(admin, {
        businessId,
        kind: "GOOGLE_CALENDAR_REFRESH_TOKEN",
        value: tokens.refreshToken,
      }),
    ]);

    const { error } = await admin.from("google_calendar_connections").upsert(
      {
        business_id: businessId,
        google_calendar_status: "connected",
        google_account_email: email,
        calendar_id: primaryCalendar?.id ?? "primary",
        calendar_summary: primaryCalendar?.summary ?? "Primary calendar",
        access_token: null,
        access_token_secret_key_name: accessSecretKeyName,
        refresh_token: null,
        refresh_token_secret_key_name: refreshSecretKeyName,
        token_expires_at: tokens.expiresAt,
        connected_at: now,
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: "business_id" },
    );

    if (error) {
      return { success: false, message: error.message };
    }

    revalidateGoogleCalendarPaths();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : GOOGLE_CALENDAR_MESSAGES.oauthError;
    return { success: false, message };
  }
}

export async function disconnectGoogleCalendar(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.oauthError };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.noBusinessDescription };
  }

  try {
    const admin = createAdminClient();
    const { data: connection } = await admin
      .from("google_calendar_connections")
      .select(
        "id, access_token_secret_key_name, refresh_token_secret_key_name",
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("google_calendar_connections")
      .update({
        google_calendar_status: "disconnected",
        google_account_email: null,
        calendar_id: null,
        calendar_summary: null,
        access_token: null,
        access_token_secret_key_name: null,
        refresh_token: null,
        refresh_token_secret_key_name: null,
        token_expires_at: null,
        connected_at: null,
        last_synced_at: null,
        updated_at: now,
      })
      .eq("business_id", businessId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }

    if (connection && !updated?.id) {
      return {
        success: false,
        message: "Could not disconnect Google Calendar. Please try again.",
      };
    }

    await Promise.all([
      deleteIntegrationSecret(admin, connection?.access_token_secret_key_name),
      deleteIntegrationSecret(admin, connection?.refresh_token_secret_key_name),
    ]);

    revalidateGoogleCalendarPaths();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : GOOGLE_CALENDAR_MESSAGES.oauthError;
    return { success: false, message };
  }
}

export async function getGoogleCalendarEventsForBusiness(
  businessId: string,
): Promise<GoogleCalendarEventsResult | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  if (!hasGoogleOAuthEnv()) {
    return {
      events: [],
      timeMin: new Date().toISOString(),
      timeMax: new Date().toISOString(),
      syncError: GOOGLE_CALENDAR_MESSAGES.notConfiguredTitle,
    };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || row.google_calendar_status !== "connected" || !row.calendar_id) {
    return null;
  }

  let accessToken: string | null = null;

  try {
    accessToken = await getValidAccessToken(row);
  } catch (error) {
    return {
      events: [],
      timeMin: new Date().toISOString(),
      timeMax: new Date().toISOString(),
      syncError:
        error instanceof Error
          ? error.message
          : GOOGLE_CALENDAR_MESSAGES.oauthError,
    };
  }

  if (!accessToken) {
    return {
      events: [],
      timeMin: new Date().toISOString(),
      timeMax: new Date().toISOString(),
      syncError: GOOGLE_CALENDAR_MESSAGES.oauthError,
    };
  }

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 60);
  timeMax.setHours(23, 59, 59, 999);

  const result = await listGoogleCalendarEvents(
    accessToken,
    row.calendar_id,
    timeMin.toISOString(),
    timeMax.toISOString(),
  );

  await supabase
    .from("google_calendar_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return {
    events: result.events,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    syncError: result.error,
  };
}

export async function createGoogleCalendarEventForBusiness(input: {
  summary: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  description?: string;
}): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.eventCreateFailed };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || row.google_calendar_status !== "connected" || !row.calendar_id) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.eventCreateFailed };
  }

  const accessToken = await getValidAccessToken(row);

  if (!accessToken) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.syncError };
  }

  const { createGoogleCalendarEvent } = await import("@/lib/google-calendar/client");
  const created = await createGoogleCalendarEvent(
    accessToken,
    row.calendar_id,
    input,
  );

  if (!created.success) {
    return { success: false, message: created.error };
  }

  revalidateGoogleCalendarPaths();
  return { success: true };
}

export async function createGoogleCalendarEventForBusinessWithAdmin(input: {
  admin: ReturnType<typeof createAdminClient>;
  businessId: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  description?: string;
}): Promise<{ success: boolean; message?: string }> {
  const { data: row } = await input.admin
    .from("google_calendar_connections")
    .select("*")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || row.google_calendar_status !== "connected" || !row.calendar_id) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.eventCreateFailed };
  }

  const accessToken = await getValidAccessToken(row);

  if (!accessToken) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.syncError };
  }

  const { createGoogleCalendarEvent } = await import("@/lib/google-calendar/client");
  const created = await createGoogleCalendarEvent(accessToken, row.calendar_id, {
    summary: input.summary,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    timeZone: input.timeZone,
    description: input.description,
  });

  if (!created.success) {
    return { success: false, message: created.error };
  }

  return { success: true };
}
