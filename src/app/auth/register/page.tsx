import { redirect } from "next/navigation";

import { RegisterAuthSection } from "@/components/auth/RegisterAuthSection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/services/auth.service";
import { resolveAuthenticatedLandingPathForUser } from "@/utils/post-auth-redirect";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(await resolveAuthenticatedLandingPathForUser(user.id));
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create your OrzuX account</CardTitle>
          <CardDescription>
            Create an account to launch your multi-channel AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterAuthSection />
        </CardContent>
      </Card>
    </div>
  );
}
