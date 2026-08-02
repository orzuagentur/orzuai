import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Tenant isolation (RLS) integration test.
 *
 * Requires a NON-production test Supabase project:
 *   TEST_SUPABASE_URL
 *   TEST_SUPABASE_SERVICE_ROLE_KEY
 *   TEST_SUPABASE_ANON_KEY        (optional; falls back to the service key)
 *
 * Seeds two independent tenants (A and B) with the service role, then verifies
 * that an authenticated user of tenant A can never read tenant B's data.
 * Skips automatically when the env is not configured.
 */
const url = process.env.TEST_SUPABASE_URL?.trim();
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey = process.env.TEST_SUPABASE_ANON_KEY?.trim() || serviceKey;

const shouldRun = Boolean(url && serviceKey);
const suite = shouldRun ? describe : describe.skip;

function rand(): string {
  return Math.random().toString(36).slice(2, 10);
}

suite("RLS tenant isolation", () => {
  let admin: SupabaseClient;

  const tenantA = { userId: "", businessId: "", contactId: "", conversationId: "" };
  const tenantB = { userId: "", businessId: "", contactId: "", conversationId: "" };

  const credsA = { email: `rls-a-${Date.now()}-${rand()}@example.test`, password: `A-${rand()}-${rand()}1!` };
  const credsB = { email: `rls-b-${Date.now()}-${rand()}@example.test`, password: `B-${rand()}-${rand()}1!` };

  let clientA: SupabaseClient;

  async function seedTenant(
    creds: { email: string; password: string },
    target: typeof tenantA,
  ): Promise<void> {
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email: creds.email,
      password: creds.password,
      email_confirm: true,
    });
    if (userError || !created.user) {
      throw new Error(`createUser failed: ${userError?.message}`);
    }
    target.userId = created.user.id;

    const { data: business, error: bizError } = await admin
      .from("businesses")
      .insert({ user_id: target.userId, business_name: `Biz ${rand()}` })
      .select("id")
      .single();
    if (bizError || !business) {
      throw new Error(`business insert failed: ${bizError?.message}`);
    }
    target.businessId = business.id as string;

    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .insert({
        business_id: target.businessId,
        name: `Contact ${rand()}`,
        phone_number: `+1000${Math.floor(Math.random() * 10_000_000)}`,
      })
      .select("id")
      .single();
    if (contactError || !contact) {
      throw new Error(`contact insert failed: ${contactError?.message}`);
    }
    target.contactId = contact.id as string;

    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .insert({ business_id: target.businessId, contact_id: target.contactId })
      .select("id")
      .single();
    if (convError || !conversation) {
      throw new Error(`conversation insert failed: ${convError?.message}`);
    }
    target.conversationId = conversation.id as string;
  }

  beforeAll(async () => {
    admin = createClient(url as string, serviceKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await seedTenant(credsA, tenantA);
    await seedTenant(credsB, tenantB);

    // Sign in as tenant A and build an RLS-scoped (authenticated) client.
    const authClient = createClient(url as string, anonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signInError } =
      await authClient.auth.signInWithPassword(credsA);
    if (signInError || !signIn.session) {
      throw new Error(`sign-in failed: ${signInError?.message}`);
    }

    clientA = createClient(url as string, anonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${signIn.session.access_token}` },
      },
    });
  });

  afterAll(async () => {
    if (!admin) {
      return;
    }
    await admin
      .from("businesses")
      .delete()
      .in("id", [tenantA.businessId, tenantB.businessId].filter(Boolean));
    for (const userId of [tenantA.userId, tenantB.userId].filter(Boolean)) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("only returns the caller's own conversations", async () => {
    const { data, error } = await clientA.from("conversations").select("id, business_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => row.id as string);
    expect(ids).toContain(tenantA.conversationId);
    expect(ids).not.toContain(tenantB.conversationId);
    expect((data ?? []).every((row) => row.business_id === tenantA.businessId)).toBe(true);
  });

  it("only returns the caller's own contacts", async () => {
    const { data, error } = await clientA.from("contacts").select("id, business_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((row) => row.id as string);
    expect(ids).toContain(tenantA.contactId);
    expect(ids).not.toContain(tenantB.contactId);
  });

  it("cannot read tenant B rows even when filtering by B's business_id", async () => {
    const { data, error } = await clientA
      .from("conversations")
      .select("id")
      .eq("business_id", tenantB.businessId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("list_inbox_conversations denies access to another tenant's business", async () => {
    const { error } = await clientA.rpc("list_inbox_conversations", {
      p_business_id: tenantB.businessId,
    });
    expect(error).not.toBeNull();
  });

  it("list_inbox_conversations allows access to the caller's own business", async () => {
    const { error } = await clientA.rpc("list_inbox_conversations", {
      p_business_id: tenantA.businessId,
    });
    expect(error).toBeNull();
  });
});
