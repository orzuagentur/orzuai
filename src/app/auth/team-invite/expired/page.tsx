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

export default function TeamInviteExpiredPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-none">
        <CardHeader>
          <CardTitle>Invitation expired</CardTitle>
          <CardDescription>
            This team invitation link is invalid or has expired. Ask your workspace
            admin to send a new invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
