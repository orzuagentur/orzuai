export const CHAT_SCROLL_PIN_THRESHOLD_PX = 96;

export function isChatScrollPinnedToBottom(container: HTMLElement): boolean {
  const distance =
    container.scrollHeight - container.scrollTop - container.clientHeight;

  return distance <= CHAT_SCROLL_PIN_THRESHOLD_PX;
}

export function scrollChatToBottom(
  container: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  container.scrollTo({
    top: container.scrollHeight,
    behavior,
  });
}
