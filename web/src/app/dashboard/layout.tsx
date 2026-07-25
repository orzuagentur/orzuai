import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ProductLocksProvider } from "@/lib/product-locks-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <ProductLocksProvider>
      <AppShell email={user.email}>{children}</AppShell>
    </ProductLocksProvider>
  );
}
