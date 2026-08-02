import "server-only";

const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * Best-effort revocation of a Google OAuth token (access or refresh).
 *
 * Revoking the refresh token invalidates the entire grant on Google's side, so
 * disconnecting a channel in OrzuX also stops Google from honoring any tokens we
 * previously stored. This is intentionally non-throwing: disconnect must always
 * succeed locally even if the network call to Google fails.
 *
 * @returns `true` when Google confirmed the revocation, `false` otherwise.
 */
export async function revokeGoogleToken(
  token: string | null | undefined,
): Promise<boolean> {
  const value = token?.trim();

  if (!value) {
    return false;
  }

  try {
    const response = await fetch(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: value }).toString(),
    });

    // 200 = revoked. 400 with "invalid_token" means it was already invalid.
    if (response.ok) {
      return true;
    }

    console.warn("[google-revoke] revoke returned non-OK", {
      status: response.status,
    });
    return false;
  } catch (error) {
    console.warn("[google-revoke] revoke request failed", error);
    return false;
  }
}
