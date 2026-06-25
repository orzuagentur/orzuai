import { Suspense } from "react";

import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata = {
  title: "Вход | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
