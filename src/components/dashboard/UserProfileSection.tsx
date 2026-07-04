"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Building2Icon,
  ChevronsUpDownIcon,
  Loader2Icon,
  LogOutIcon,
  Trash2Icon,
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
import { getUserDisplayName, getUserInitials } from "@/utils/dashboard";

type UserProfileSectionProps = {
  userProfile: DashboardUserProfile;
};

export function UserProfileSection({ userProfile }: UserProfileSectionProps) {
  const [isSigningOut, startSignOutTransition] = useTransition();
  const displayName = getUserDisplayName(
    userProfile.fullName,
    userProfile.email,
  );
  const initials = getUserInitials(userProfile.fullName, userProfile.email);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                href={DASHBOARD_ROUTES.settingsAccount}
                className="flex items-center gap-2 rounded-sm px-1 py-1.5 text-left text-sm transition-colors hover:bg-accent"
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
            <DropdownMenuItem asChild>
              <Link href={DASHBOARD_ROUTES.settingsProfile}>
                <Building2Icon className="size-4" />
                {ACCOUNT_SETTINGS_MESSAGES.profileNav}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={DASHBOARD_ROUTES.settingsAccount}>
                <UserIcon className="size-4" />
                {ACCOUNT_SETTINGS_MESSAGES.accountNav}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`${DASHBOARD_ROUTES.settingsAccount}#delete-account`}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4" />
                {ACCOUNT_SETTINGS_MESSAGES.deleteAccount}
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
