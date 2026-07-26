import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ProductLocksProvider } from "@/lib/product-locks-client";
import { redirect } from "@/i18n/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect({ href: "/login", locale: await getLocale() });
  }

  return (
    <ProductLocksProvider>
      <AppShell email={user.email}>{children}</AppShell>
    </ProductLocksProvider>
  );
}
