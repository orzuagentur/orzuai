import Image from "next/image";

type GoogleCalendarIconProps = {
  className?: string;
  size?: number;
};

/** Official Google Calendar product icon. */
export function GoogleCalendarIcon({
  className,
  size = 24,
}: GoogleCalendarIconProps) {
  return (
    <Image
      src="/icons/google-calendar-icon.png"
      alt=""
      width={size}
      height={size}
      className={className}
      priority
      unoptimized
    />
  );
}
