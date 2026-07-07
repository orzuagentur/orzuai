import "server-only";

type BroadcastEmailParams = {
  title: string;
  body: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderPlatformBroadcastEmail({
  title,
  body,
  actionUrl,
  actionLabel,
}: BroadcastEmailParams): { html: string } {
  const actionBlock =
    actionUrl && actionLabel
      ? `<p style="margin:24px 0 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(actionLabel)}</a></p>`
      : "";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Segoe UI,sans-serif;color:#18181b">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4e4e7">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a">OrzuX</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(body)}</p>
                ${actionBlock}
                <p style="margin:32px 0 0;font-size:12px;color:#71717a">Official message from OrzuX.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html };
}
