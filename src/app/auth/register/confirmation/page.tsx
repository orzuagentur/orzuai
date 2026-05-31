import { redirect } from "next/navigation";
import { z } from "zod";

import { RegistrationConfirmation } from "@/components/auth/RegistrationConfirmation";
import { APP_ROUTES, AUTH_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";

const confirmationQuerySchema = z.object({
  email: z.string().trim().email().optional(),
});

type RegisterConfirmationPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function RegisterConfirmationPage({
  searchParams,
}: RegisterConfirmationPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  const params = await searchParams;
  const parsed = confirmationQuerySchema.safeParse(params);
  const email = parsed.success ? parsed.data.email : undefined;

  if (!email) {
    redirect(AUTH_ROUTES.register);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <RegistrationConfirmation email={email} />
    </div>
  );
}
