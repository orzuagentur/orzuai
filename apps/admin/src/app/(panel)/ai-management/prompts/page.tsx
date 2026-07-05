import { PlatformPromptsManager } from "@/components/PlatformPromptsManager";
import { fetchPlatformPromptsAction } from "@/features/platform-prompts/actions";

export const metadata = {
  title: "Prompt CMS | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function PlatformPromptsAdminPage() {
  const { groups } = await fetchPlatformPromptsAction();

  return <PlatformPromptsManager initialGroups={groups} />;
}
