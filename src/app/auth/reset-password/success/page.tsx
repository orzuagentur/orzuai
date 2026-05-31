import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AUTH_ROUTES } from "@/constants/routes";
import { PASSWORD_RESET_MESSAGES } from "@/features/auth/constants";
import { CheckCircle2Icon } from "lucide-react";

export default function ResetPasswordSuccessPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2Icon className="size-6" />
          </div>
          <CardTitle>{PASSWORD_RESET_MESSAGES.successTitle}</CardTitle>
          <CardDescription>
            {PASSWORD_RESET_MESSAGES.successDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href={AUTH_ROUTES.login}>Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
