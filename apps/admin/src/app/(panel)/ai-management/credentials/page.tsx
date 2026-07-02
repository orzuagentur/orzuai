import { AiGeneralApiPanel } from "@/components/AiGeneralApiPanel";
import { fetchAiPlatformManagementAction } from "@/features/ai-management/platform-actions";

export default async function AiCredentialsPage() {
  const data = await fetchAiPlatformManagementAction();

  return <AiGeneralApiPanel initialCredentials={data.credentials} />;
}
