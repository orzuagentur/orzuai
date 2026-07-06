export function buildWebsiteChatEmbedSnippet(
  scriptUrl: string,
  widgetToken: string,
  siteKey?: string,
): string {
  const keyAttr = siteKey ? ` data-site-key="${siteKey}"` : "";

  return `<script src="${scriptUrl}" data-widget-token="${widgetToken}"${keyAttr} async></script>`;
}
