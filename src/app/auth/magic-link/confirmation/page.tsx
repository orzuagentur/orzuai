import { redirect } from "next/navigation";
import { z } from "zod";

import { MagicLinkConfirmation } from "@/components/auth/MagicLinkConfirmation";
import { AUTH_ROUTES } from "@/constants/routes";

const confirmationQuerySchema = z.object({
  email: z.string().trim().email().optional(),
});

type MagicLinkConfirmationPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function MagicLinkConfirmationPage({
  searchParams,
}: MagicLinkConfirmationPageProps) {
  const params = await searchParams;
  const parsed = confirmationQuerySchema.safeParse(params);
  const email = parsed.success ? parsed.data.email : undefined;

  if (!email) {
    redirect(AUTH_ROUTES.login);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <MagicLinkConfirmation email={email} />
    </div>
  );
}
