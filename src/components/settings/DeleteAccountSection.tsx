"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEGAL_ROUTES } from "@/constants/routes";
import { ACCOUNT_DELETION_MESSAGES } from "@/features/auth/constants";
import { useDeleteAccount } from "@/hooks/use-delete-account";

const CONFIRMATION_VALUE = "DELETE";

export function DeleteAccountSection() {
  const [confirmation, setConfirmation] = useState("");
  const { deleteAccount, isLoading } = useDeleteAccount();
  const canDelete = confirmation.trim() === CONFIRMATION_VALUE;

  return (
    <Card className="border-destructive/30 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2Icon className="size-4" />
          {ACCOUNT_DELETION_MESSAGES.sectionTitle}
        </CardTitle>
        <CardDescription>
          {ACCOUNT_DELETION_MESSAGES.sectionDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {ACCOUNT_DELETION_MESSAGES.warning}
        </p>

        <p className="text-sm text-muted-foreground">
          Learn more on our{" "}
          <Link
            href={LEGAL_ROUTES.dataDeletion}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            User Data Deletion
          </Link>{" "}
          page.
        </p>

        <div className="space-y-2">
          <Label htmlFor="delete-account-confirmation">
            {ACCOUNT_DELETION_MESSAGES.confirmationLabel}
          </Label>
          <Input
            id="delete-account-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={CONFIRMATION_VALUE}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={!canDelete || isLoading}
          onClick={() => {
            void deleteAccount({ confirmation: "DELETE" });
          }}
        >
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Deleting account...
            </>
          ) : (
            ACCOUNT_DELETION_MESSAGES.buttonLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
