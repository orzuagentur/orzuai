"use client";

import { useMemo, useState } from "react";
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removeBusinessAiProviderKeyAction,
  revealBusinessAiProviderKeyAction,
  setPreferCustomerAiKeysAction,
} from "@/features/ai-assistant/actions/save-business-ai-provider-key";
import {
  getAiKeyDisplayName,
  getAiKeyProviderLabel,
} from "@/features/ai-assistant/ai-key-display";
import { AI_KEYS_SETTINGS_MESSAGES } from "@/features/settings/ai-keys.constants";
import { Badge } from "@/components/ui/badge";
import type { AiProvider } from "@/lib/ai/constants";
import type { BusinessAiKeysSettings } from "@/services/business-ai-credentials.service";

type AiProviderKeysSettingsPanelProps = {
  settings: BusinessAiKeysSettings;
};

type DeleteDialogState = {
  provider: AiProvider;
  step: 1 | 2 | 3;
  confirmationCode: string;
  enteredCode: string;
};

function generateConfirmationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatUpdatedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AiProviderKeysSettingsPanel({
  settings,
}: AiProviderKeysSettingsPanelProps) {
  const [preferCustomerAiKeys, setPreferCustomerAiKeys] = useState(
    settings.preferCustomerAiKeys,
  );
  const [revealedKeys, setRevealedKeys] = useState<
    Partial<Record<AiProvider, string>>
  >({});
  const [visibleProviders, setVisibleProviders] = useState<
    Partial<Record<AiProvider, boolean>>
  >({});
  const [loadingProvider, setLoadingProvider] = useState<AiProvider | null>(
    null,
  );
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const configuredCredentials = useMemo(
    () => settings.credentials.filter((credential) => credential.configured),
    [settings.credentials],
  );

  async function handlePreferenceChange(checked: boolean) {
    setIsSavingPreference(true);

    try {
      const result = await setPreferCustomerAiKeysAction({
        preferCustomerAiKeys: checked,
      });

      if (!result.success) {
        toast.error(
          result.message ?? AI_KEYS_SETTINGS_MESSAGES.preferAllAgentsFailed,
        );
        return;
      }

      setPreferCustomerAiKeys(checked);
      toast.success(AI_KEYS_SETTINGS_MESSAGES.preferAllAgentsSaved);
    } finally {
      setIsSavingPreference(false);
    }
  }

  async function handleReveal(provider: AiProvider) {
    if (revealedKeys[provider]) {
      setVisibleProviders((current) => ({ ...current, [provider]: true }));
      return;
    }

    setLoadingProvider(provider);

    try {
      const result = await revealBusinessAiProviderKeyAction({ provider });

      if (!result.success) {
        toast.error(
          result.message ?? AI_KEYS_SETTINGS_MESSAGES.revealFailed,
        );
        return;
      }

      setRevealedKeys((current) => ({
        ...current,
        [provider]: result.apiKey,
      }));
      setVisibleProviders((current) => ({ ...current, [provider]: true }));
    } finally {
      setLoadingProvider(null);
    }
  }

  function handleHide(provider: AiProvider) {
    setVisibleProviders((current) => ({ ...current, [provider]: false }));
  }

  async function handleCopy(provider: AiProvider) {
    let value = revealedKeys[provider];

    if (!value) {
      setLoadingProvider(provider);

      try {
        const result = await revealBusinessAiProviderKeyAction({ provider });

        if (!result.success) {
          toast.error(
            result.message ?? AI_KEYS_SETTINGS_MESSAGES.revealFailed,
          );
          return;
        }

        value = result.apiKey;
        setRevealedKeys((current) => ({ ...current, [provider]: value }));
      } finally {
        setLoadingProvider(null);
      }
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(AI_KEYS_SETTINGS_MESSAGES.copiedKey);
    } catch {
      toast.error(AI_KEYS_SETTINGS_MESSAGES.copyFailed);
    }
  }

  function openDeleteDialog(provider: AiProvider) {
    setDeleteDialog({
      provider,
      step: 1,
      confirmationCode: generateConfirmationCode(),
      enteredCode: "",
    });
  }

  function closeDeleteDialog() {
    setDeleteDialog(null);
    setIsDeleting(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteDialog) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await removeBusinessAiProviderKeyAction({
        provider: deleteDialog.provider,
      });

      if (!result.success) {
        toast.error(result.message ?? AI_KEYS_SETTINGS_MESSAGES.deleteFailed);
        return;
      }

      toast.success(AI_KEYS_SETTINGS_MESSAGES.deleteSuccess);
      closeDeleteDialog();
      window.location.reload();
    } finally {
      setIsDeleting(false);
    }
  }

  const deleteCodeMatches =
    deleteDialog?.enteredCode.trim() === deleteDialog?.confirmationCode;

  return (
    <>
      <Card className="mx-auto w-full max-w-3xl shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-primary" />
            <CardTitle>{AI_KEYS_SETTINGS_MESSAGES.sectionTitle}</CardTitle>
          </div>
          <CardDescription>
            {AI_KEYS_SETTINGS_MESSAGES.sectionDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="flex items-start gap-3 rounded-lg border bg-muted/15 p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={preferCustomerAiKeys}
              disabled={isSavingPreference || configuredCredentials.length === 0}
              onChange={(event) => void handlePreferenceChange(event.target.checked)}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                {AI_KEYS_SETTINGS_MESSAGES.preferAllAgentsLabel}
              </span>
              <span className="block text-xs text-muted-foreground">
                {AI_KEYS_SETTINGS_MESSAGES.preferAllAgentsHint}
              </span>
            </span>
          </label>

          {configuredCredentials.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center">
              <p className="text-sm font-medium">
                {AI_KEYS_SETTINGS_MESSAGES.emptyTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {AI_KEYS_SETTINGS_MESSAGES.emptyDescription}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {configuredCredentials.map((credential) => {
                const provider = credential.provider;
                const isVisible = visibleProviders[provider] ?? false;
                const revealedValue = revealedKeys[provider];
                const updatedLabel = formatUpdatedAt(credential.updatedAt);
                const isLoading = loadingProvider === provider;

                return (
                  <div
                    key={provider}
                    className="space-y-3 rounded-xl border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {getAiKeyDisplayName(credential)}
                          </p>
                          <Badge variant="secondary">
                            {getAiKeyProviderLabel(credential)}
                          </Badge>
                        </div>
                        {updatedLabel ? (
                          <p className="text-xs text-muted-foreground">
                            {AI_KEYS_SETTINGS_MESSAGES.savedAt(updatedLabel)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isVisible ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleHide(provider)}
                          >
                            <EyeOffIcon className="size-4" />
                            {AI_KEYS_SETTINGS_MESSAGES.hideKey}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => void handleReveal(provider)}
                          >
                            {isLoading ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                              <EyeIcon className="size-4" />
                            )}
                            {AI_KEYS_SETTINGS_MESSAGES.showKey}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => void handleCopy(provider)}
                        >
                          <CopyIcon className="size-4" />
                          {AI_KEYS_SETTINGS_MESSAGES.copyKey}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(provider)}
                        >
                          <Trash2Icon className="size-4" />
                          {AI_KEYS_SETTINGS_MESSAGES.deleteKey}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`settings-key-${provider}`}>
                        {AI_KEYS_SETTINGS_MESSAGES.keyHiddenLabel}
                      </Label>
                      <Input
                        id={`settings-key-${provider}`}
                        readOnly
                        type={isVisible ? "text" : "password"}
                        value={
                          isVisible && revealedValue
                            ? revealedValue
                            : credential.keyPreview ?? "••••••••"
                        }
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {deleteDialog?.step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteStep1Title}
                </DialogTitle>
                <DialogDescription>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteStep1Description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDeleteDialog}>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteCancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    setDeleteDialog((current) =>
                      current ? { ...current, step: 2 } : current,
                    )
                  }
                >
                  {AI_KEYS_SETTINGS_MESSAGES.deleteContinue}
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {deleteDialog?.step === 2 ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteStep2Title}
                </DialogTitle>
                <DialogDescription>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteStep2Description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDeleteDialog}>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteCancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    setDeleteDialog((current) =>
                      current
                        ? {
                            ...current,
                            step: 3,
                            confirmationCode: generateConfirmationCode(),
                            enteredCode: "",
                          }
                        : current,
                    )
                  }
                >
                  {AI_KEYS_SETTINGS_MESSAGES.deleteContinue}
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {deleteDialog?.step === 3 ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteStep3Title}
                </DialogTitle>
                <DialogDescription>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteStep3Description(
                    deleteDialog.confirmationCode,
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-key-confirmation">
                  {AI_KEYS_SETTINGS_MESSAGES.deleteCodeLabel}
                </Label>
                <Input
                  id="delete-key-confirmation"
                  value={deleteDialog.enteredCode}
                  onChange={(event) =>
                    setDeleteDialog((current) =>
                      current
                        ? { ...current, enteredCode: event.target.value }
                        : current,
                    )
                  }
                  placeholder={deleteDialog.confirmationCode}
                  autoComplete="off"
                  className="font-mono"
                />
                {deleteDialog.enteredCode.trim() &&
                !deleteCodeMatches ? (
                  <p className="text-xs text-destructive">
                    {AI_KEYS_SETTINGS_MESSAGES.deleteCodeMismatch}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDeleteDialog}>
                  {AI_KEYS_SETTINGS_MESSAGES.deleteCancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!deleteCodeMatches || isDeleting}
                  onClick={() => void handleDeleteConfirm()}
                >
                  {isDeleting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  {AI_KEYS_SETTINGS_MESSAGES.deleteConfirm}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
