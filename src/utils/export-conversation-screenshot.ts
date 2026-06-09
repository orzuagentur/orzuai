import type { ConversationDetail } from "@/types/chat.types";
import { parseMediaMessage } from "@/utils/chat-media";
import { formatRelativeTime } from "@/utils/dashboard";

function formatMessageLine(
  conversation: ConversationDetail,
  message: ConversationDetail["messages"][number],
): string {
  const sender =
    message.senderType === "client"
      ? conversation.contactName
      : message.senderType === "ai"
        ? "AI"
        : "You";
  const { media, text } = parseMediaMessage(message.content);
  const body = media
    ? `[${media.kind}] ${media.fileName}${text ? `: ${text}` : ""}`
    : text;
  const time = formatRelativeTime(message.createdAt);

  return `[${time}] ${sender}: ${body}`;
}

export function downloadConversationTranscript(conversation: ConversationDetail) {
  const header = [
    `Conversation: ${conversation.contactName}`,
    `Phone: ${conversation.contactPhone}`,
    `Channel: ${conversation.channel}`,
    `Exported: ${new Date().toLocaleString()}`,
    "",
  ].join("\n");

  const lines = conversation.messages.map((message) =>
    formatMessageLine(conversation, message),
  );
  const content = `${header}${lines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = conversation.contactName.replace(/[^\w.-]+/g, "_").slice(0, 40);

  anchor.href = url;
  anchor.download = `chat-${safeName}-${Date.now()}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadConversationScreenshot(
  conversation: ConversationDetail,
) {
  const width = 900;
  const padding = 32;
  const lineHeight = 22;
  const lines = conversation.messages.map((message) =>
    formatMessageLine(conversation, message),
  );
  const headerLines = [
    conversation.contactName,
    conversation.contactPhone,
    `Exported ${new Date().toLocaleString()}`,
    "",
  ];

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  context.font = "14px Geist, Arial, sans-serif";
  const wrapped: string[] = [...headerLines];

  for (const line of lines) {
    const words = line.split(" ");
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;

      if (context.measureText(next).width > width - padding * 2) {
        if (current) {
          wrapped.push(current);
        }

        current = word;
      } else {
        current = next;
      }
    }

    if (current) {
      wrapped.push(current);
    }
  }

  const height = Math.max(480, padding * 2 + wrapped.length * lineHeight + 16);
  canvas.width = width;
  canvas.height = height;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f172a";
  context.font = "bold 18px Geist, Arial, sans-serif";
  context.fillText(conversation.contactName, padding, padding + 4);
  context.font = "13px Geist, Arial, sans-serif";
  context.fillStyle = "#64748b";
  context.fillText(conversation.contactPhone, padding, padding + 28);
  context.fillStyle = "#111827";
  context.font = "14px Geist, Arial, sans-serif";

  wrapped.slice(3).forEach((line, index) => {
    context.fillText(line, padding, padding + 56 + index * lineHeight);
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Unable to create screenshot image.");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = conversation.contactName.replace(/[^\w.-]+/g, "_").slice(0, 40);

  anchor.href = url;
  anchor.download = `chat-${safeName}-${Date.now()}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}
