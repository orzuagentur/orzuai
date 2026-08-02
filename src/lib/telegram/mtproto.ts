import "server-only";

import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { computeCheck } from "telegram/Password";
import { LogLevel } from "telegram/extensions/Logger";

import { ENV_KEYS } from "@/constants/env-keys";

/**
 * Personal-account Telegram (MTProto) helpers built on GramJS.
 *
 * The main app runs short-lived clients (connect → act → disconnect) for the
 * login flow and outbound sends. Real-time receiving lives in the dedicated
 * worker (apps/telegram-userbot).
 *
 * NOTE: automating a personal Telegram account is against Telegram's ToS and
 * can get the number limited/banned. The Bot API is the ToS-safe alternative.
 */

export type TelegramApiCredentials = {
  apiId: number;
  apiHash: string;
};

/** Reads the app-level API_ID / API_HASH from env. Returns null when missing. */
export function getTelegramApiCredentials(): TelegramApiCredentials | null {
  const rawId = process.env[ENV_KEYS.TELEGRAM_API_ID]?.trim();
  const apiHash = process.env[ENV_KEYS.TELEGRAM_API_HASH]?.trim();
  const apiId = rawId ? Number.parseInt(rawId, 10) : NaN;

  if (!Number.isFinite(apiId) || apiId <= 0 || !apiHash) {
    return null;
  }

  return { apiId, apiHash };
}

export function isTelegramMtprotoConfigured(): boolean {
  return getTelegramApiCredentials() !== null;
}

/**
 * Creates and connects a GramJS client from an (optional) StringSession.
 * Pass the saved session string to resume, or `""`/undefined to start fresh.
 */
export async function createConnectedClient(
  creds: TelegramApiCredentials,
  session?: string | null,
): Promise<TelegramClient> {
  const stringSession = new StringSession(session ?? "");
  const client = new TelegramClient(stringSession, creds.apiId, creds.apiHash, {
    connectionRetries: 3,
  });

  client.setLogLevel(LogLevel.ERROR);
  await client.connect();

  return client;
}

/** Serializes the current auth state to a StringSession for encrypted storage. */
export function saveSession(client: TelegramClient): string {
  return client.session.save() as unknown as string;
}

export async function disconnectClient(client: TelegramClient): Promise<void> {
  try {
    await client.disconnect();
    await client.destroy();
  } catch {
    // best-effort teardown
  }
}

export type SendCodeResult = {
  session: string;
  phoneCodeHash: string;
};

/**
 * Step 1 of login: request an SMS/app login code for `phoneNumber`.
 * Returns the intermediate session (auth key + DC) plus the phoneCodeHash,
 * both of which must be persisted to complete sign-in in a later request.
 */
export async function requestLoginCode(
  creds: TelegramApiCredentials,
  phoneNumber: string,
): Promise<SendCodeResult> {
  const client = await createConnectedClient(creds);
  try {
    const { phoneCodeHash } = await client.sendCode(
      { apiId: creds.apiId, apiHash: creds.apiHash },
      phoneNumber,
    );
    return { session: saveSession(client), phoneCodeHash };
  } finally {
    await disconnectClient(client);
  }
}

export type SignInResult =
  | { status: "connected"; session: string; user: TelegramSelf }
  | { status: "password_required"; session: string };

export type TelegramSelf = {
  id: string;
  username: string | null;
  firstName: string | null;
  phone: string | null;
};

function mapSelf(user: Api.User): TelegramSelf {
  return {
    id: String(user.id),
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    phone: user.phone ?? null,
  };
}

async function resolveSelf(client: TelegramClient): Promise<TelegramSelf> {
  const me = (await client.getMe()) as Api.User;
  return mapSelf(me);
}

/**
 * Step 2 of login: submit the code the user received. Resumes from the session
 * produced by {@link requestLoginCode}. When the account has 2FA enabled,
 * returns `password_required` and the caller must call {@link submitPassword}.
 */
export async function submitLoginCode(
  creds: TelegramApiCredentials,
  input: {
    session: string;
    phoneNumber: string;
    phoneCodeHash: string;
    code: string;
  },
): Promise<SignInResult> {
  const client = await createConnectedClient(creds, input.session);
  try {
    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: input.phoneNumber,
          phoneCodeHash: input.phoneCodeHash,
          phoneCode: input.code,
        }),
      );
    } catch (error) {
      if (isPasswordRequiredError(error)) {
        return { status: "password_required", session: saveSession(client) };
      }
      throw error;
    }

    const user = await resolveSelf(client);
    return { status: "connected", session: saveSession(client), user };
  } finally {
    await disconnectClient(client);
  }
}

/**
 * Step 3 of login (only when 2FA is enabled): submit the account password.
 * Uses SRP via account.getPassword + auth.checkPassword.
 */
export async function submitPassword(
  creds: TelegramApiCredentials,
  input: { session: string; password: string },
): Promise<{ session: string; user: TelegramSelf }> {
  const client = await createConnectedClient(creds, input.session);
  try {
    const passwordInfo = await client.invoke(new Api.account.GetPassword());
    const check = await computeCheck(passwordInfo, input.password);
    await client.invoke(new Api.auth.CheckPassword({ password: check }));

    const user = await resolveSelf(client);
    return { session: saveSession(client), user };
  } finally {
    await disconnectClient(client);
  }
}

function isPasswordRequiredError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return message.includes("SESSION_PASSWORD_NEEDED");
}

/** Sends a text message to a Telegram peer (username, phone, or numeric id). */
export async function sendTextMessage(
  creds: TelegramApiCredentials,
  input: { session: string; peer: string; message: string },
): Promise<{ messageId: number | null }> {
  const client = await createConnectedClient(creds, input.session);
  try {
    const result = await client.sendMessage(input.peer, {
      message: input.message,
    });
    return { messageId: result?.id ?? null };
  } finally {
    await disconnectClient(client);
  }
}

export type TelegramIncomingMessage = {
  externalMessageId: string;
  chatId: string;
  senderId: string | null;
  senderName: string | null;
  text: string;
  sentAt: string;
};

/**
 * Fetches recent incoming messages across dialogs. Used by cron/worker paths to
 * pull new inbound messages. `limitPerDialog` caps per-conversation fetch size.
 */
export async function fetchRecentIncoming(
  creds: TelegramApiCredentials,
  input: { session: string; dialogLimit?: number; limitPerDialog?: number },
): Promise<TelegramIncomingMessage[]> {
  const client = await createConnectedClient(creds, input.session);
  const out: TelegramIncomingMessage[] = [];

  try {
    const dialogs = await client.getDialogs({ limit: input.dialogLimit ?? 20 });

    for (const dialog of dialogs) {
      if (!dialog.isUser) {
        continue;
      }

      const messages = await client.getMessages(dialog.inputEntity, {
        limit: input.limitPerDialog ?? 20,
      });

      for (const message of messages) {
        if (message.out || !message.message) {
          continue;
        }

        const senderId = message.senderId ? String(message.senderId) : null;
        out.push({
          externalMessageId: String(message.id),
          chatId: String(dialog.id),
          senderId,
          senderName:
            typeof dialog.title === "string" && dialog.title.length > 0
              ? dialog.title
              : null,
          text: message.message,
          sentAt: new Date(message.date * 1000).toISOString(),
        });
      }
    }

    return out;
  } finally {
    await disconnectClient(client);
  }
}
