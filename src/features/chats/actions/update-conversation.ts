"use server";

import {
  updateConversationInternalNote,
  updateConversationStatus,
} from "@/services/chat.service";
import type {
  UpdateConversationInternalNoteInput,
  UpdateConversationStatusInput,
} from "@/types/chat.types";

export async function updateConversationInternalNoteAction(
  input: UpdateConversationInternalNoteInput,
) {
  return updateConversationInternalNote(input);
}

export async function updateConversationStatusAction(
  input: UpdateConversationStatusInput,
) {
  return updateConversationStatus(input);
}
