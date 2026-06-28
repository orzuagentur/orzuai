export type BookingGuest = {
  name: string;
  email: string;
};

export function extractBookingGuests(input: {
  description?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}): BookingGuest[] {
  const fromDescription = (input.description ?? "")
    .split("\n")
    .map((line) => line.match(/^Guest \d+: (.+?) <([^>]+)>$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      name: match[1]?.trim() ?? "",
      email: match[2]?.trim().toLowerCase() ?? "",
    }))
    .filter((guest) => guest.name && guest.email.includes("@"));

  if (fromDescription.length > 0) {
    return fromDescription;
  }

  const primaryEmail = input.customerEmail?.trim().toLowerCase() ?? "";
  const names = (input.customerName ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0 && !primaryEmail.includes("@")) {
    return [];
  }

  if (primaryEmail.includes("@")) {
    return [
      {
        name: names.join(", ") || "Guest",
        email: primaryEmail,
      },
    ];
  }

  return [];
}

export async function notifyBookingGuests(input: {
  guests: BookingGuest[];
  send: (guest: BookingGuest) => Promise<{ success: boolean; error?: string }>;
}): Promise<{ success: boolean; error?: string }> {
  const seen = new Set<string>();

  for (const guest of input.guests) {
    if (seen.has(guest.email)) {
      continue;
    }

    seen.add(guest.email);
    const result = await input.send(guest);

    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}
