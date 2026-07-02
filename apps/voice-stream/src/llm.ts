export async function* streamOpenAiReply(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  abortSignal?: AbortSignal;
}): AsyncGenerator<string, void, void> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 120,
      stream: true,
    }),
    signal: input.abortSignal,
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(
      body.slice(0, 200) || `OpenAI stream failed (${response.status})`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") {
        return;
      }

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Skip malformed SSE chunks.
      }
    }
  }
}

export function buildConversationPrompt(input: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): string {
  const lines = input.history.slice(-12).map((turn) =>
    turn.role === "user"
      ? `Customer: ${turn.content}`
      : `Assistant: ${turn.content}`,
  );
  lines.push(`Customer: ${input.userMessage}`);
  lines.push("Assistant:");
  return lines.join("\n");
}
