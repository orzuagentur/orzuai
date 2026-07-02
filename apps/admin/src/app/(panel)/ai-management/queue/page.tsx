import { redirect } from "next/navigation";

export const metadata = {
  title: "Очередь LLM | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default function AiManagementQueuePage() {
  redirect("/ai-management/use-cases");
}
