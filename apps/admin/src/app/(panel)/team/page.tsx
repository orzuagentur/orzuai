import { TeamManager } from "@/components/TeamManager";
import { fetchTeamAction } from "@/features/team/actions";

export const metadata = {
  title: "Команда | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const result = await fetchTeamAction();

  return (
    <TeamManager
      members={result.members}
      auditLog={result.auditLog}
      actor={result.actor}
    />
  );
}
