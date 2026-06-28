import Image from "next/image";

type OrzuxCalendarPageIconProps = {
  className?: string;
  size?: number;
};

export function OrzuxCalendarPageIcon({
  className,
  size = 28,
}: OrzuxCalendarPageIconProps) {
  return (
    <Image
      src="/icons/orzux-calendar-icon.png"
      alt=""
      width={size}
      height={size}
      className={className}
      priority
      unoptimized
    />
  );
}
