export type CopilotLauncherAnchor =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

const ANCHOR_ORDER: CopilotLauncherAnchor[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
];

const ANCHOR_CLASS_NAMES: Record<CopilotLauncherAnchor, string> = {
  "bottom-right":
    "bottom-4 right-4 sm:bottom-6 sm:right-6 items-end",
  "bottom-left":
    "bottom-4 left-4 sm:bottom-6 sm:left-6 items-start",
  "top-right": "top-6 right-4 sm:top-8 sm:right-6 items-end",
  "top-left": "top-6 left-4 sm:top-8 sm:left-6 items-start",
};

const CHAT_ANCHOR_CLASS_NAMES: Record<CopilotLauncherAnchor, string> = {
  "bottom-right":
    "bottom-16 right-4 sm:bottom-20 sm:right-6 items-end",
  "bottom-left":
    "bottom-16 left-4 sm:bottom-20 sm:left-6 items-start",
  "top-right": "top-6 right-4 sm:top-8 sm:right-6 items-end",
  "top-left": "top-6 left-4 sm:top-8 sm:left-6 items-start",
};

const OVERLAP_PADDING_PX = 12;

function getViewportMargin(): number {
  return window.innerWidth >= 640 ? 24 : 16;
}

function rectsOverlap(first: DOMRect, second: DOMRect, padding = OVERLAP_PADDING_PX): boolean {
  return !(
    first.right + padding < second.left ||
    first.left - padding > second.right ||
    first.bottom + padding < second.top ||
    first.top - padding > second.bottom
  );
}

function isVisiblePageButton(button: HTMLButtonElement): boolean {
  if (button.closest("[data-platform-copilot-root]")) {
    return false;
  }

  if (button.disabled || button.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const rect = button.getBoundingClientRect();

  if (rect.width < 8 || rect.height < 8) {
    return false;
  }

  const style = window.getComputedStyle(button);

  if (
    style.visibility === "hidden" ||
    style.display === "none" ||
    style.pointerEvents === "none" ||
    Number(style.opacity) < 0.05
  ) {
    return false;
  }

  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

export function collectVisiblePageButtonRects(): DOMRect[] {
  return Array.from(document.querySelectorAll("button"))
    .filter(isVisiblePageButton)
    .map((button) => button.getBoundingClientRect());
}

function getAnchorRect(
  anchor: CopilotLauncherAnchor,
  width: number,
  height: number,
  margin: number,
): DOMRect {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  switch (anchor) {
    case "bottom-right":
      return new DOMRect(
        viewportWidth - margin - width,
        viewportHeight - margin - height,
        width,
        height,
      );
    case "bottom-left":
      return new DOMRect(margin, viewportHeight - margin - height, width, height);
    case "top-right":
      return new DOMRect(viewportWidth - margin - width, margin, width, height);
    case "top-left":
      return new DOMRect(margin, margin, width, height);
  }
}

function anchorOverlapsButtons(
  anchor: CopilotLauncherAnchor,
  widgetWidth: number,
  widgetHeight: number,
  buttonRects: DOMRect[],
): boolean {
  const margin = getViewportMargin();
  const widgetRect = getAnchorRect(anchor, widgetWidth, widgetHeight, margin);

  return buttonRects.some((buttonRect) => rectsOverlap(widgetRect, buttonRect));
}

export function getCopilotAnchorClassName(
  anchor: CopilotLauncherAnchor,
  inChat = false,
): string {
  return (inChat ? CHAT_ANCHOR_CLASS_NAMES : ANCHOR_CLASS_NAMES)[anchor];
}

export function resolveCopilotLauncherAnchor(input: {
  widgetWidth: number;
  widgetHeight: number;
  buttonRects: DOMRect[];
  preferredAnchor?: CopilotLauncherAnchor;
}): CopilotLauncherAnchor {
  const preferred = input.preferredAnchor ?? "bottom-right";
  const candidates = [
    preferred,
    ...ANCHOR_ORDER.filter((anchor) => anchor !== preferred),
  ];

  for (const anchor of candidates) {
    if (
      !anchorOverlapsButtons(
        anchor,
        input.widgetWidth,
        input.widgetHeight,
        input.buttonRects,
      )
    ) {
      return anchor;
    }
  }

  return "bottom-left";
}

export function widgetRectOverlapsButtons(
  widgetRect: DOMRect,
  buttonRects: DOMRect[],
): boolean {
  return buttonRects.some((buttonRect) => rectsOverlap(widgetRect, buttonRect));
}
