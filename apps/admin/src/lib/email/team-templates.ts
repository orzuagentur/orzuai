import type { PlatformAdminRole } from "@/features/team/types";
import { roleLabel } from "@/features/team/permissions";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderAdminInviteEmail(input: {
  inviteeEmail: string;
  role: PlatformAdminRole;
  inviterEmail: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const role = roleLabel(input.role);

  return {
    subject: `Вас назначили администратором OrzuX (${role})`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Доступ к OrzuX Admin</h2>
        <p>Здравствуйте!</p>
        <p>
          <strong>${escapeHtml(input.inviterEmail)}</strong> назначил(а) вас
          администратором платформы OrzuX с ролью
          <strong>${escapeHtml(role)}</strong>.
        </p>
        <p>
          <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">
            Войти в админ-панель
          </a>
        </p>
        <p style="color:#666;font-size:13px">
          Если кнопка не работает, откройте ссылку:<br />
          <a href="${escapeHtml(input.loginUrl)}">${escapeHtml(input.loginUrl)}</a>
        </p>
      </div>
    `.trim(),
  };
}

export function renderInviteAcceptedEmail(input: {
  inviterEmail: string;
  inviteeEmail: string;
  role: PlatformAdminRole;
}): { subject: string; html: string } {
  const role = roleLabel(input.role);

  return {
    subject: `${input.inviteeEmail} принял приглашение в OrzuX Admin`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Администратор вошёл в систему</h2>
        <p>
          <strong>${escapeHtml(input.inviteeEmail)}</strong> принял приглашение
          и вошёл в админ-панель OrzuX с ролью
          <strong>${escapeHtml(role)}</strong>.
        </p>
      </div>
    `.trim(),
  };
}
