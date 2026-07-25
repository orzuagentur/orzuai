import { createClient } from "@/lib/supabase/server";
import type { ProductLocksMap } from "@/lib/product-locks";

/** Server-side product locks (empty = all open). */
export async function getProductLocks(): Promise<ProductLocksMap> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_locks")
      .select("locks")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return {};
    return (data.locks || {}) as ProductLocksMap;
  } catch {
    return {};
  }
}
