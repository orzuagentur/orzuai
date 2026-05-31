import { Suspense } from "react";

import { VerifySuccessContent } from "@/app/auth/verify/success/VerifySuccessContent";

export default function VerifySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
          <p className="text-sm text-muted-foreground">Verifying your email...</p>
        </div>
      }
    >
      <VerifySuccessContent />
    </Suspense>
  );
}
