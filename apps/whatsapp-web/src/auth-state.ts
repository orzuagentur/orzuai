import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";

type KeyStore = Record<string, Record<string, unknown>>;

export type StoredAuth = {
  creds: AuthenticationCreds;
  keys: KeyStore;
};

export type AuthStateBundle = {
  state: AuthenticationState;
  /** Serializes the full auth blob (creds + signal keys) for encrypted storage. */
  serialize: () => string;
};

/** Parses a previously serialized auth blob, or `null` when absent/invalid. */
export function parseStoredAuth(raw: string | null | undefined): StoredAuth | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw, BufferJSON.reviver) as StoredAuth;
  } catch {
    return null;
  }
}

/**
 * Builds a Baileys {@link AuthenticationState} backed by an in-memory blob that
 * is persisted (encrypted) by the caller. Mirrors the official
 * `useMultiFileAuthState` behaviour but with a single serializable blob.
 */
export function makeAuthState(
  stored: StoredAuth | null,
  onChange?: () => void,
): AuthStateBundle {
  const creds: AuthenticationCreds = stored?.creds ?? initAuthCreds();
  const keys: KeyStore = stored?.keys ?? {};

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ) => {
        const store = keys[type] ?? {};
        const result: { [id: string]: SignalDataTypeMap[T] } = {};

        for (const id of ids) {
          let value = store[id];
          if (value !== undefined) {
            if (type === "app-state-sync-key") {
              value = proto.Message.AppStateSyncKeyData.fromObject(
                value as Record<string, unknown>,
              );
            }
            result[id] = value as SignalDataTypeMap[T];
          }
        }

        return result;
      },
      set: async (data) => {
        for (const type of Object.keys(data)) {
          const typed = type as keyof SignalDataTypeMap;
          keys[type] = keys[type] ?? {};
          const bucket = data[typed] ?? {};
          for (const id of Object.keys(bucket)) {
            keys[type][id] = bucket[id];
          }
        }
        onChange?.();
      },
    },
  };

  return {
    state,
    serialize: () => JSON.stringify({ creds, keys }, BufferJSON.replacer),
  };
}
