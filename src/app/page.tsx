import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { APP_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  return <LandingPage />;
}
