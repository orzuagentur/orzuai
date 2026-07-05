"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Building2Icon,
  ChevronsUpDownIcon,
  Loader2Icon,
  LogOutIcon,
  UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { ACCOUNT_SETTINGS_MESSAGES } from "@/features/settings/constants";
import type { DashboardUserProfile } from "@/types/dashboard.types";
import { cn } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/utils/dashboard";

type UserProfileSectionProps = {
  userProfile: DashboardUserProfile;
};

export function UserProfileSection({ userProfile }: UserProfileSectionProps) {
  const pathname = usePathname();
  const [isSigningOut, startSignOutTransition] = useTransition();
  const displayName = getUserDisplayName(
    userProfile.fullName,
    userProfile.email,
  );
  const initials = getUserInitials(userProfile.fullName, userProfile.email);
  const isAccountPage = pathname === DASHBOARD_ROUTES.account;
  const isProfilePage = pathname === DASHBOARD_ROUTES.profile;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isAccountPage && "bg-primary/10 text-foreground ring-1 ring-primary/20",
              )}
            >
              <Avatar className="size-8 rounded-lg">
                {userProfile.avatarUrl ? (
                  <AvatarImage src={userProfile.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {userProfile.email}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <Link
                href={DASHBOARD_ROUTES.account}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-1 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  isAccountPage && "bg-primary/10 ring-1 ring-primary/20",
                )}
              >
                <Avatar className="size-8 rounded-lg">
                  {userProfile.avatarUrl ? (
                    <AvatarImage
                      src={userProfile.avatarUrl}
                      alt={displayName}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userProfile.email}
                  </span>
                </div>
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              Current plan: {userProfile.plan}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              className={cn(isProfilePage && "bg-accent font-medium")}
            >
              <Link href={DASHBOARD_ROUTES.profile}>
                <Building2Icon className="size-4" />
                {ACCOUNT_SETTINGS_MESSAGES.profileNav}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className={cn(isAccountPage && "bg-accent font-medium")}
            >
              <Link href={DASHBOARD_ROUTES.account}>
                <UserIcon className="size-4" />
                {ACCOUNT_SETTINGS_MESSAGES.accountNav}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSigningOut}
              onSelect={(event) => {
                event.preventDefault();
                startSignOutTransition(async () => {
                  await signOutAction();
                });
              }}
            >
              {isSigningOut ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <LogOutIcon className="size-4" />
              )}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
