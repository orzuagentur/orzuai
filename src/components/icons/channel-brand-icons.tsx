"use client";

import { useId, type SVGProps } from "react";

import type { IntegrationChannelId } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";

type IconProps = SVGProps<SVGSVGElement>;

/** Regular WhatsApp mark (consumer / WhatsApp Web). */
export function WhatsAppIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

/**
 * Official WhatsApp Business app mark: green tile, white WhatsApp glyph,
 * briefcase badge (Meta / WhatsApp Business brand).
 */
export function WhatsAppBusinessIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="48" height="48" rx="12" fill="#25D366" />
      <path
        fill="#fff"
        d="M24.05 10.2c-7.18 0-13.02 5.84-13.02 13.02 0 2.3.61 4.54 1.77 6.52L11 37.8l8.3-2.18a13 13 0 0 0 4.75.89h.01c7.18 0 13.02-5.84 13.02-13.02S31.23 10.2 24.05 10.2zm7.6 18.36c-.32.9-1.86 1.65-2.6 1.76-.7.1-1.58.14-2.55-.16-.59-.18-1.34-.44-2.31-.86-4.07-1.76-6.72-5.87-6.92-6.14-.2-.27-1.62-2.16-1.62-4.12s1.02-2.92 1.39-3.32c.36-.4.79-.5 1.05-.5h.76c.24 0 .57-.09.89.68.32.79 1.1 2.73 1.2 2.93.1.2.16.43.03.69-.13.27-.2.43-.39.66-.2.23-.41.51-.59.69-.2.2-.4.41-.17.8.23.4 1.02 1.68 2.19 2.72 1.5 1.34 2.77 1.76 3.16 1.96.4.2.63.16.86-.1.23-.25.99-1.15 1.25-1.55.27-.4.53-.33.89-.2.36.13 2.3 1.08 2.69 1.28.4.2.66.3.76.46.1.17.1.96-.22 1.86z"
      />
      <circle cx="36.2" cy="36.2" r="9.2" fill="#128C7E" />
      <circle cx="36.2" cy="36.2" r="8.2" fill="#075E54" />
      <path
        fill="#fff"
        d="M32.7 33.1h7c.5 0 .9.4.9.9v4.2c0 .5-.4.9-.9.9h-7c-.5 0-.9-.4-.9-.9v-4.2c0-.5.4-.9.9-.9zm.9-1.2h5.2v1h-5.2v-1zm1.1.3v.7h3v-.7h-3z"
      />
    </svg>
  );
}

export function InstagramIcon({ className, ...props }: IconProps) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="30%"
          cy="107%"
          r="150%"
        >
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  );
}

export function TelegramIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#26A5E4"
        d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </svg>
  );
}

export function VoiceIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function SmsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function WebsiteFormsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

/** Official Twilio mark (red). */
export function TwilioIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path
        fill="#F22F46"
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-3.6 5.4a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm7.2 0a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm-7.2 7.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm7.2 0a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z"
      />
    </svg>
  );
}

export function MessengerIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path
        fill="#0084FF"
        d="M12 2C6.477 2 2 6.145 2 11.243c0 2.906 1.446 5.502 3.709 7.207V22l3.405-1.872c.909.252 1.871.388 2.886.388 5.523 0 10-4.145 10-9.243S17.523 2 12 2z"
      />
    </svg>
  );
}

export function WebsiteChatIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Official Gmail mark (envelope M). */
export function GmailIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#EA4335"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#4A90E2"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Official Microsoft Outlook mark (Fluent-style app icon):
 * blue tile + white envelope + signature “O” panel.
 */
export function OutlookIcon({ className, ...props }: IconProps) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="4"
          x2="40"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0B5CAB" />
          <stop offset="1" stopColor="#0078D4" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill={`url(#${gradientId})`} />
      <path
        fill="#fff"
        d="M20.5 14h18A3.5 3.5 0 0 1 42 17.5v13A3.5 3.5 0 0 1 38.5 34h-18A3.5 3.5 0 0 1 17 30.5v-13A3.5 3.5 0 0 1 20.5 14z"
      />
      <path
        fill="#0078D4"
        d="M20.8 15.6 29.2 22l8.5-6.4v1.5l-8.5 6.5-8.4-6.5v-1.6z"
      />
      <path
        fill="#28A8EA"
        d="M6 12.5A4.5 4.5 0 0 1 10.5 8h11A4.5 4.5 0 0 1 26 12.5v23A4.5 4.5 0 0 1 21.5 40h-11A4.5 4.5 0 0 1 6 35.5v-23z"
      />
      <path
        fill="#fff"
        d="M16.1 18.2c-2.7 0-4.7 2.1-4.7 5.1s2 5.1 4.7 5.1 4.7-2.1 4.7-5.1-2-5.1-4.7-5.1zm0 1.8c1.6 0 2.7 1.4 2.7 3.3s-1.1 3.3-2.7 3.3-2.7-1.4-2.7-3.3 1.1-3.3 2.7-3.3z"
      />
    </svg>
  );
}

/** Official Google Calendar mark. */
export function GoogleCalendarIcon({ className }: IconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/google-calendar-icon.png"
      alt=""
      className={className ? `${className} object-contain` : "size-6 object-contain"}
      aria-hidden="true"
    />
  );
}

const CHANNEL_ICON_MAP = {
  whatsapp: WhatsAppBusinessIcon,
  whatsapp_web: WhatsAppIcon,
  instagram: InstagramIcon,
  telegram: TelegramIcon,
  telegram_user: TelegramIcon,
  website_forms: WebsiteFormsIcon,
  website_chat: WebsiteChatIcon,
  voice: VoiceIcon,
  sms: SmsIcon,
  email: GmailIcon,
  outlook: OutlookIcon,
  google_calendar: GoogleCalendarIcon,
  facebook_messenger: MessengerIcon,
} as const;

export type ChannelBrandId = keyof typeof CHANNEL_ICON_MAP;

export function isChannelBrandId(value: string): value is ChannelBrandId {
  return value in CHANNEL_ICON_MAP;
}

export function ChannelBrandIcon({
  channel,
  className,
}: {
  channel: MessagingChannel | IntegrationChannelId;
  className?: string;
}) {
  const Icon = isChannelBrandId(channel) ? CHANNEL_ICON_MAP[channel] : WebsiteFormsIcon;

  return <Icon className={className} />;
}
