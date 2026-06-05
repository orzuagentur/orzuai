import Link from "next/link";
import { MailCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AUTH_ROUTES } from "@/constants/routes";
import { MAGIC_LINK_MESSAGES } from "@/features/auth/constants";

type MagicLinkConfirmationProps = {
  email?: string;
};

export function MagicLinkConfirmation({ email }: MagicLinkConfirmationProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-info/10 text-info">
          <MailCheckIcon className="size-6" />
        </div>
        <CardTitle>{MAGIC_LINK_MESSAGES.confirmationTitle}</CardTitle>
        <CardDescription>
          {MAGIC_LINK_MESSAGES.confirmationDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {email ? (
          <p className="text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, a
            sign-in link is on its way.
          </p>
        ) : null}
        <Button asChild className="w-full">
          <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
