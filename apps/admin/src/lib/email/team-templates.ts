import type { PlatformAdminRole } from "@/features/team/types";
import { roleLabel } from "@/features/team/permissions";

const BRAND = {
  primary: "#7c3aed",
  primaryDark: "#6d28d9",
  background: "#f8fafc",
  surface: "#f4f4f5",
  card: "#ffffff",
  foreground: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAdminLayout(input: {
  previewText: string;
  title: string;
  bodyHtml: string;
}): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.foreground};">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(input.previewText)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:${BRAND.background};">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(24,24,27,0.08);">
            <tr>
              <td style="padding:36px 36px 24px;text-align:center;background:linear-gradient(180deg, rgba(124,58,237,0.12) 0%, rgba(255,255,255,0) 100%);">
                <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:${BRAND.primary};">OrzuX Admin</p>
                <p style="margin:0;font-size:14px;color:${BRAND.muted};">Панель управления платформой</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 32px;">${input.bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:24px 36px;border-top:1px solid ${BRAND.border};background:${BRAND.surface};text-align:center;">
                <p style="margin:0;font-size:12px;color:${BRAND.muted};">&copy; ${year} OrzuX. Все права защищены.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="border-radius:12px;background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%);">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function renderAdminInviteEmail(input: {
  inviteeEmail: string;
  role: PlatformAdminRole;
  inviterEmail: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const role = roleLabel(input.role);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">Доступ к OrzuX Admin</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.muted};">
      Здравствуйте! <strong>${escapeHtml(input.inviterEmail)}</strong> назначил(а) вас
      администратором платформы OrzuX с ролью <strong>${escapeHtml(role)}</strong>.
    </p>
    ${renderButton(input.loginUrl, "Войти в админ-панель")}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
      Если кнопка не работает, откройте ссылку:<br />
      <a href="${escapeHtml(input.loginUrl)}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(input.loginUrl)}</a>
    </p>
  `;

  return {
    subject: `Вас назначили администратором OrzuX (${role})`,
    html: renderAdminLayout({
      previewText: `Доступ к OrzuX Admin — роль ${role}`,
      title: "Доступ к OrzuX Admin",
      bodyHtml,
    }),
  };
}

export function renderInviteAcceptedEmail(input: {
  inviterEmail: string;
  inviteeEmail: string;
  role: PlatformAdminRole;
}): { subject: string; html: string } {
  const role = roleLabel(input.role);

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">Администратор вошёл в систему</h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.muted};">
      <strong>${escapeHtml(input.inviteeEmail)}</strong> принял приглашение и вошёл в админ-панель OrzuX
      с ролью <strong>${escapeHtml(role)}</strong>.
    </p>
  `;

  return {
    subject: `${input.inviteeEmail} принял приглашение в OrzuX Admin`,
    html: renderAdminLayout({
      previewText: `${input.inviteeEmail} принял приглашение`,
      title: "Приглашение принято",
      bodyHtml,
    }),
  };
}
