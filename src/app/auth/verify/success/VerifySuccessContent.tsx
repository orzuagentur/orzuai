"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_ROUTES } from "@/constants/routes";
import { VERIFICATION_MESSAGES } from "@/features/auth/constants";
import { getSafeRedirectPath } from "@/utils/auth";

export function VerifySuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace(nextPath);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [nextPath, router]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2Icon className="size-6" />
          </div>
          <CardTitle>{VERIFICATION_MESSAGES.successTitle}</CardTitle>
          <CardDescription>
            {VERIFICATION_MESSAGES.successDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href={nextPath}>Continue to dashboard</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href={APP_ROUTES.home}>Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
