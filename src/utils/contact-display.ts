export function formatContactIdentifier(identifier: string): string {
  if (identifier.startsWith("ig:")) {
    return `Instagram · ${identifier.slice(3)}`;
  }

  if (identifier.startsWith("tg:")) {
    return `Telegram · ${identifier.slice(3)}`;
  }

  return identifier;
}
