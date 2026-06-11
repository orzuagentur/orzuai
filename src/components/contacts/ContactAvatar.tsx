"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getContactInitials } from "@/utils/contact-avatar";

type ContactAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: "default" | "sm" | "lg";
};

export function ContactAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
  size = "default",
}: ContactAvatarProps) {
  const initials = getContactInitials(name);

  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-primary/10 font-medium text-primary",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
