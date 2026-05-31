import { redirect } from "next/navigation";
import { z } from "zod";

import { PasswordResetConfirmation } from "@/components/auth/PasswordResetConfirmation";
import { AUTH_ROUTES } from "@/constants/routes";

const confirmationQuerySchema = z.object({
  email: z.string().trim().email().optional(),
});

type ForgotPasswordConfirmationPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function ForgotPasswordConfirmationPage({
  searchParams,
}: ForgotPasswordConfirmationPageProps) {
  const params = await searchParams;
  const parsed = confirmationQuerySchema.safeParse(params);
  const email = parsed.success ? parsed.data.email : undefined;

  if (!email) {
    redirect(AUTH_ROUTES.forgotPassword);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <PasswordResetConfirmation email={email} />
    </div>
  );
}
