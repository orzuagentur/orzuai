import { SecretsManager } from "@/components/SecretsManager";
import { fetchAuditLogAction, fetchSecretsAction } from "@/features/secrets/actions";

export const metadata = {
  title: "Секреты | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function SecretsSettingsPage() {
  const [secretsResult, auditResult] = await Promise.all([
    fetchSecretsAction(),
    fetchAuditLogAction(),
  ]);

  return (
    <SecretsManager
      secrets={secretsResult.secrets}
      auditLog={auditResult.entries}
    />
  );
}
