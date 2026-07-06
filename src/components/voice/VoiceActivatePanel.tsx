"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle2Icon,
  Loader2Icon,
  PhoneCallIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { TwilioIcon } from "@/components/icons/channel-brand-icons";
import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { disconnectTwilioAction } from "@/features/twilio/actions/disconnect";
import { purchaseTwilioPhoneNumberAction } from "@/features/twilio/actions/purchase-phone-number";
import { refreshTwilioPhoneNumbersAction } from "@/features/twilio/actions/refresh-phone-numbers";
import { resyncTwilioAction } from "@/features/twilio/actions/resync";
import { searchTwilioPhoneNumbersAction } from "@/features/twilio/actions/search-phone-numbers";
import { selectTwilioPhoneNumberAction } from "@/features/twilio/actions/select-phone";
import { TWILIO_INTEGRATION_HREF, TWILIO_MESSAGES, SMS_INTEGRATION_HREF } from "@/features/twilio/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { triggerTestVoiceCallAction } from "@/features/voice/actions/trigger-test-voice-call";
import { toggleVoiceAiAction } from "@/features/voice/actions/toggle-voice-ai";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type {
  TwilioAvailablePhoneNumber,
  TwilioPhoneNumberOption,
} from "@/types/twilio-integration.types";
import type {
  VoiceAgentSettings,
  VoiceConnectConfig,
  VoiceConnectionData,
} from "@/types/voice-agent.types";

type VoiceActivatePanelProps = {
  connection: VoiceConnectionData;
  settings: VoiceAgentSettings;
  config: VoiceConnectConfig;
  availablePhoneNumbers: TwilioPhoneNumberOption[];
  hasBusiness: boolean;
  embeddedInHub?: boolean;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export function VoiceActivatePanel({
  connection,
  settings,
  config,
  availablePhoneNumbers,
  hasBusiness,
  embeddedInHub = false,
}: VoiceActivatePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPhoneSid, setSelectedPhoneSid] = useState<string | null>(null);
  const [showNumberManager, setShowNumberManager] = useState(false);
  const [isSelectingPhone, setIsSelectingPhone] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isRefreshingNumbers, setIsRefreshingNumbers] = useState(false);
  const [localPhoneNumbers, setLocalPhoneNumbers] = useState(availablePhoneNumbers);
  const [countryCode, setCountryCode] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [availableToBuy, setAvailableToBuy] = useState<TwilioAvailablePhoneNumber[]>([]);
  const [isSearchingNumbers, setIsSearchingNumbers] = useState(false);
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(settings.aiEnabled);
  const [isTogglingAi, setIsTogglingAi] = useState(false);

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";
  const headerClassName = embeddedInHub ? "px-0 pt-0" : undefined;
  const contentClassName = embeddedInHub ? "px-0 pb-0" : undefined;

  useEffect(() => {
    setLocalPhoneNumbers(availablePhoneNumbers);
  }, [availablePhoneNumbers]);

  useEffect(() => {
    if (
      selectedPhoneSid &&
      !availablePhoneNumbers.some((phone) => phone.sid === selectedPhoneSid)
    ) {
      setSelectedPhoneSid(null);
    }
  }, [availablePhoneNumbers, selectedPhoneSid]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success(TWILIO_MESSAGES.connectedTitle);
      router.replace(TWILIO_INTEGRATION_HREF);
    } else if (searchParams.get("authorized") === "1") {
      toast.success(TWILIO_MESSAGES.oauthSuccess);
      router.replace(TWILIO_INTEGRATION_HREF);
    } else if (searchParams.get("error") === "denied") {
      toast.error(TWILIO_MESSAGES.oauthDenied);
      router.replace(TWILIO_INTEGRATION_HREF);
    } else if (searchParams.get("error")) {
      toast.error(TWILIO_MESSAGES.oauthError);
      router.replace(TWILIO_INTEGRATION_HREF);
    }
  }, [router, searchParams]);

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{VOICE_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>{VOICE_MESSAGES.noBusinessDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!config.isConfigured) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{TWILIO_MESSAGES.notConfiguredTitle}</CardTitle>
          <CardDescription>{TWILIO_MESSAGES.notConfiguredDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-3 px-0 pb-0" : "space-y-3"}>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{TWILIO_MESSAGES.authorizeRedirectLabel}</p>
            <code className="mt-1 block break-all text-xs">
              {config.authorizeRedirectUri}
            </code>
            <p className="mt-3 font-medium">{TWILIO_MESSAGES.deauthorizeRedirectLabel}</p>
            <code className="mt-1 block break-all text-xs">
              {config.deauthorizeRedirectUri}
            </code>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleSelectPhone() {
    if (!selectedPhoneSid) {
      return;
    }

    setIsSelectingPhone(true);

    try {
      const result = await selectTwilioPhoneNumberAction({
        phoneSid: selectedPhoneSid,
      });

      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.saveFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.saved);
      setShowNumberManager(false);
      router.refresh();
    } finally {
      setIsSelectingPhone(false);
    }
  }

  async function handleRefreshNumbers() {
    setIsRefreshingNumbers(true);

    try {
      const result = await refreshTwilioPhoneNumbersAction();

      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.refreshFailed);
        return;
      }

      if (result.numbers) {
        setLocalPhoneNumbers(result.numbers);
      }

      toast.success(TWILIO_MESSAGES.refreshSuccess);
      router.refresh();
    } finally {
      setIsRefreshingNumbers(false);
    }
  }

  async function handleSearchNumbers() {
    setIsSearchingNumbers(true);

    try {
      const result = await searchTwilioPhoneNumbersAction({
        countryCode,
        areaCode: areaCode.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.searchNumbersFailed);
        setAvailableToBuy([]);
        return;
      }

      setAvailableToBuy(result.numbers);

      if (result.numbers.length === 0) {
        toast.message("Доступных номеров не найдено. Попробуйте другой код региона.");
      }
    } finally {
      setIsSearchingNumbers(false);
    }
  }

  async function handlePurchaseNumber(phoneNumber: string) {
    setPurchasingNumber(phoneNumber);

    try {
      const result = await purchaseTwilioPhoneNumberAction({ phoneNumber });

      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.purchaseNumberFailed);
        return;
      }

      toast.success(TWILIO_MESSAGES.buyNumberSuccess);
      router.refresh();
    } finally {
      setPurchasingNumber(null);
    }
  }

  async function handleResync() {
    setIsResyncing(true);

    try {
      const result = await resyncTwilioAction();

      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.resyncFailed);
        return;
      }

      toast.success(TWILIO_MESSAGES.resyncSuccess);
      router.refresh();
    } finally {
      setIsResyncing(false);
    }
  }

  async function handleToggleAi(nextValue: boolean) {
    setIsTogglingAi(true);

    try {
      const result = await toggleVoiceAiAction(nextValue);

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.aiSaveFailed);
        return;
      }

      setAiEnabled(nextValue);
      toast.success(VOICE_MESSAGES.aiSaved);
      router.refresh();
    } finally {
      setIsTogglingAi(false);
    }
  }

  async function handleTestCall() {
    if (!testPhone.trim()) {
      return;
    }

    setIsTesting(true);

    try {
      const result = await triggerTestVoiceCallAction({
        phoneNumber: testPhone,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.testCallFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.testCallSent);
      router.refresh();
    } finally {
      setIsTesting(false);
    }
  }

  if (connection.pendingPhoneSelection) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{TWILIO_MESSAGES.selectPhoneTitle}</CardTitle>
          <CardDescription>{TWILIO_MESSAGES.selectPhoneDescription}</CardDescription>
        </CardHeader>
        <CardContent className={`space-y-5 ${contentClassName ?? ""}`}>
          {connection.accountFriendlyName ? (
            <p className="text-sm text-muted-foreground">
              {TWILIO_MESSAGES.accountLabel}: {connection.accountFriendlyName}
            </p>
          ) : null}

          <TwilioNumberSelectionSection
            activePhoneSid={null}
            availableToBuy={availableToBuy}
            areaCode={areaCode}
            countryCode={countryCode}
            isRefreshingNumbers={isRefreshingNumbers}
            isSearchingNumbers={isSearchingNumbers}
            isSelectingPhone={isSelectingPhone}
            localPhoneNumbers={localPhoneNumbers}
            purchasingNumber={purchasingNumber}
            selectedPhoneSid={selectedPhoneSid}
            onAreaCodeChange={setAreaCode}
            onCountryChange={setCountryCode}
            onPurchase={(phoneNumber) => void handlePurchaseNumber(phoneNumber)}
            onRefresh={() => void handleRefreshNumbers()}
            onSearch={() => void handleSearchNumbers()}
            onSelectPhone={() => void handleSelectPhone()}
            onSelectedPhoneChange={setSelectedPhoneSid}
          />
        </CardContent>
      </Card>
    );
  }

  if (connection.status === "connected") {
    return (
      <div
        className={
          embeddedInHub
            ? "flex w-full flex-col gap-6"
            : "mx-auto flex w-full max-w-2xl flex-col gap-6"
        }
      >
        <Card className={cardClassName}>
          <CardHeader className={headerClassName}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PhoneCallIcon className="size-5 text-indigo-600" />
                  {TWILIO_MESSAGES.connectedTitle}
                </CardTitle>
                <CardDescription>{TWILIO_MESSAGES.connectDescription}</CardDescription>
              </div>
              <Badge>{TWILIO_MESSAGES.connectedStatus}</Badge>
            </div>
          </CardHeader>
          <CardContent className={`space-y-6 ${contentClassName ?? ""}`}>
            <div className="grid gap-3 rounded-lg border p-4 text-sm">
              <p>
                <span className="text-muted-foreground">
                  {TWILIO_MESSAGES.phoneLabel}:{" "}
                </span>
                <a
                  href="#twilio-number-settings"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {connection.phoneNumber}
                </a>
              </p>
              {connection.accountFriendlyName ? (
                <p>
                  <span className="text-muted-foreground">
                    {TWILIO_MESSAGES.accountLabel}:{" "}
                  </span>
                  {connection.accountFriendlyName}
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">
                  {TWILIO_MESSAGES.connectedAtLabel}:{" "}
                </span>
                {formatDateTime(connection.connectedAt)}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {TWILIO_MESSAGES.lastSyncLabel}:{" "}
                </span>
                {formatDateTime(connection.lastSyncedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isResyncing}
                onClick={() => void handleResync()}
              >
                {isResyncing ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCwIcon className="size-4" />
                    {TWILIO_MESSAGES.resyncButton}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNumberManager((value) => !value)}
              >
                {showNumberManager
                  ? TWILIO_MESSAGES.hideNumberPickerButton
                  : TWILIO_MESSAGES.changeNumberButton}
              </Button>
            </div>

            {showNumberManager ? (
              <TwilioNumberSelectionSection
                activePhoneSid={connection.phoneSid}
                availableToBuy={availableToBuy}
                areaCode={areaCode}
                countryCode={countryCode}
                isRefreshingNumbers={isRefreshingNumbers}
                isSearchingNumbers={isSearchingNumbers}
                isSelectingPhone={isSelectingPhone}
                localPhoneNumbers={localPhoneNumbers}
                purchasingNumber={purchasingNumber}
                selectedPhoneSid={selectedPhoneSid}
                onAreaCodeChange={setAreaCode}
                onCountryChange={setCountryCode}
                onPurchase={(phoneNumber) => void handlePurchaseNumber(phoneNumber)}
                onRefresh={() => void handleRefreshNumbers()}
                onSearch={() => void handleSearchNumbers()}
                onSelectPhone={() => void handleSelectPhone()}
                onSelectedPhoneChange={setSelectedPhoneSid}
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={SMS_INTEGRATION_HREF}>Configure SMS</Link>
              </Button>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="space-y-1">
                <p className="font-medium">{VOICE_MESSAGES.autoCallbackTitle}</p>
                <p className="text-muted-foreground">
                  {VOICE_MESSAGES.autoCallbackDescription}
                </p>
              </div>
            </div>

            <VoiceAiSection
              aiEnabled={aiEnabled}
              aiConfigured={config.aiConfigured}
              isToggling={isTogglingAi}
              onToggle={handleToggleAi}
            />

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">{VOICE_MESSAGES.testCallTitle}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                  placeholder={VOICE_MESSAGES.phonePlaceholder}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isTesting || !testPhone.trim()}
                  onClick={() => void handleTestCall()}
                >
                  {isTesting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    VOICE_MESSAGES.testCallButton
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <IntegrationDangerZone
          resourceLabel="Twilio"
          successMessage={TWILIO_MESSAGES.disconnected}
          onDisconnect={disconnectTwilioAction}
        />
      </div>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className={headerClassName}>
        <CardTitle className="flex items-center gap-2">
          <TwilioIcon className="size-5" />
          {TWILIO_MESSAGES.connectTitle}
        </CardTitle>
        <CardDescription>{TWILIO_MESSAGES.connectDescription}</CardDescription>
      </CardHeader>
      <CardContent className={`space-y-5 ${contentClassName ?? ""}`}>
        <p className="text-sm text-muted-foreground">{TWILIO_MESSAGES.connectNote}</p>

        {config.aiConfigured ? (
          <p className="text-sm text-muted-foreground">{VOICE_MESSAGES.aiDescription}</p>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {VOICE_MESSAGES.aiMissing}
          </p>
        )}

        <Button type="button" className="w-full sm:w-auto" asChild>
          <a href={config.connectUrl}>{TWILIO_MESSAGES.connectButton}</a>
        </Button>
      </CardContent>
    </Card>
  );
}

function TwilioNumberSelectionSection({
  activePhoneSid,
  availableToBuy,
  areaCode,
  countryCode,
  isRefreshingNumbers,
  isSearchingNumbers,
  isSelectingPhone,
  localPhoneNumbers,
  purchasingNumber,
  selectedPhoneSid,
  onAreaCodeChange,
  onCountryChange,
  onPurchase,
  onRefresh,
  onSearch,
  onSelectPhone,
  onSelectedPhoneChange,
}: {
  activePhoneSid: string | null;
  availableToBuy: TwilioAvailablePhoneNumber[];
  areaCode: string;
  countryCode: string;
  isRefreshingNumbers: boolean;
  isSearchingNumbers: boolean;
  isSelectingPhone: boolean;
  localPhoneNumbers: TwilioPhoneNumberOption[];
  purchasingNumber: string | null;
  selectedPhoneSid: string | null;
  onAreaCodeChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onPurchase: (phoneNumber: string) => void;
  onRefresh: () => void;
  onSearch: () => void;
  onSelectPhone: () => void;
  onSelectedPhoneChange: (phoneSid: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{TWILIO_MESSAGES.numberPickerTitle}</p>
          <p className="text-sm text-muted-foreground">
            {TWILIO_MESSAGES.numberPickerDescription}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshingNumbers}
          onClick={onRefresh}
        >
          {isRefreshingNumbers ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <>
              <RefreshCwIcon className="size-4" />
              {TWILIO_MESSAGES.refreshButton}
            </>
          )}
        </Button>
      </div>

      {localPhoneNumbers.length === 0 ? (
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-dashed p-4 text-sm">
            <p className="font-medium">{TWILIO_MESSAGES.noPhoneNumbersTitle}</p>
            <p className="text-muted-foreground">
              {TWILIO_MESSAGES.noPhoneNumbersDescription}
            </p>
          </div>

          <TwilioBuyNumberSection
            countryCode={countryCode}
            areaCode={areaCode}
            availableToBuy={availableToBuy}
            isSearching={isSearchingNumbers}
            purchasingNumber={purchasingNumber}
            onCountryChange={onCountryChange}
            onAreaCodeChange={onAreaCodeChange}
            onSearch={onSearch}
            onPurchase={onPurchase}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {localPhoneNumbers.map((phone) => {
              const isActive = phone.sid === activePhoneSid;
              const isSelected = phone.sid === selectedPhoneSid;

              return (
                <button
                  key={phone.sid}
                  type="button"
                  onClick={() => onSelectedPhoneChange(phone.sid)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : isActive
                        ? "border-primary/40 bg-muted/30"
                        : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{phone.phoneNumber}</p>
                      {phone.friendlyName ? (
                        <p className="text-sm text-muted-foreground">
                          {phone.friendlyName}
                        </p>
                      ) : null}
                    </div>
                    {isActive ? (
                      <Badge variant="outline">{TWILIO_MESSAGES.currentNumberLabel}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      phone.capabilities.voice ? "Voice" : null,
                      phone.capabilities.sms ? "SMS" : null,
                      phone.capabilities.mms ? "MMS" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            disabled={!selectedPhoneSid || isSelectingPhone}
            onClick={onSelectPhone}
          >
            {isSelectingPhone ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              TWILIO_MESSAGES.selectPhoneButton
            )}
          </Button>
        </>
      )}
    </div>
  );
}

function TwilioBuyNumberSection({
  countryCode,
  areaCode,
  availableToBuy,
  isSearching,
  purchasingNumber,
  onCountryChange,
  onAreaCodeChange,
  onSearch,
  onPurchase,
}: {
  countryCode: string;
  areaCode: string;
  availableToBuy: TwilioAvailablePhoneNumber[];
  isSearching: boolean;
  purchasingNumber: string | null;
  onCountryChange: (value: string) => void;
  onAreaCodeChange: (value: string) => void;
  onSearch: () => void;
  onPurchase: (phoneNumber: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{TWILIO_MESSAGES.buyNumberTitle}</p>
        <p className="text-sm text-muted-foreground">
          {TWILIO_MESSAGES.buyNumberDescription}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="twilio-country">{TWILIO_MESSAGES.buyNumberCountryLabel}</Label>
          <select
            id="twilio-country"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={countryCode}
            onChange={(event) => onCountryChange(event.target.value)}
          >
            <option value="US">United States (US)</option>
            <option value="CA">Canada (CA)</option>
            <option value="GB">United Kingdom (GB)</option>
            <option value="DE">Germany (DE)</option>
            <option value="AU">Australia (AU)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="twilio-area">{TWILIO_MESSAGES.buyNumberAreaCodeLabel}</Label>
          <Input
            id="twilio-area"
            value={areaCode}
            onChange={(event) => onAreaCodeChange(event.target.value)}
            placeholder="415"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={isSearching}
        onClick={onSearch}
      >
        {isSearching ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            {TWILIO_MESSAGES.buyNumberSearching}
          </>
        ) : (
          TWILIO_MESSAGES.buyNumberSearchButton
        )}
      </Button>

      {availableToBuy.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {availableToBuy.map((entry) => (
            <li
              key={entry.phoneNumber}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div>
                <p className="font-medium">{entry.phoneNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {[entry.locality, entry.region].filter(Boolean).join(", ")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={purchasingNumber !== null}
                onClick={() => onPurchase(entry.phoneNumber)}
              >
                {purchasingNumber === entry.phoneNumber ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  TWILIO_MESSAGES.buyNumberPurchaseButton
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function VoiceAiSection({
  aiEnabled,
  aiConfigured,
  isToggling,
  onToggle,
}: {
  aiEnabled: boolean;
  aiConfigured: boolean;
  isToggling: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{VOICE_MESSAGES.aiTitle}</p>
          <p className="text-sm text-muted-foreground">
            {aiEnabled && aiConfigured
              ? VOICE_MESSAGES.aiActive
              : VOICE_MESSAGES.aiInactive}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border"
            checked={aiEnabled}
            disabled={!aiConfigured || isToggling}
            onChange={(event) => onToggle(event.target.checked)}
          />
          {VOICE_MESSAGES.aiEnabled}
        </label>
      </div>
      {!aiConfigured ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {VOICE_MESSAGES.aiMissing}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{VOICE_MESSAGES.knowledgeHint}</p>
      )}
    </div>
  );
}
