"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2Icon,
  CopyIcon,
  Loader2Icon,
  PhoneCallIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { disconnectTwilioAction } from "@/features/twilio/actions/disconnect";
import { purchaseTwilioPhoneNumberAction } from "@/features/twilio/actions/purchase-phone-number";
import { saveVoiceForwardToAction } from "@/features/twilio/actions/save-forward-to";
import { searchTwilioPhoneNumbersAction } from "@/features/twilio/actions/search-phone-numbers";
import {
  formatMonthlyPrice,
  getTwilioCountryPricing,
  TWILIO_COUNTRY_PRICING,
} from "@/features/twilio/country-pricing";
import { TWILIO_MESSAGES } from "@/features/twilio/constants";
import { triggerTestVoiceCallAction } from "@/features/voice/actions/trigger-test-voice-call";
import { toggleVoiceAiAction } from "@/features/voice/actions/toggle-voice-ai";
import type { TwilioAvailablePhoneNumber } from "@/types/twilio-integration.types";
import type {
  VoiceAgentSettings,
  VoiceConnectConfig,
  VoiceConnectionData,
} from "@/types/voice-agent.types";

type VoiceActivatePanelProps = {
  connection: VoiceConnectionData;
  settings: VoiceAgentSettings;
  config: VoiceConnectConfig;
  availablePhoneNumbers: unknown[];
  diagnostics?: unknown;
  hasBusiness: boolean;
  embeddedInHub?: boolean;
  forwardToE164?: string | null;
};

const FORWARDING_GUIDES = [
  {
    id: "fritzbox",
    label: "FritzBox / Router",
    steps: [
      "Откройте FritzBox → Telefonie → Rufbehandlung → Rufumleitung.",
      "Создайте правило: все входящие (или после 10 сек) → Ziel = номер OrzuX.",
      "Сохраните и позвоните на свой обычный номер для проверки.",
    ],
  },
  {
    id: "mobile",
    label: "Смартфон",
    steps: [
      "Настройки → Телефон → Переадресация / Call forwarding.",
      "Включите «Если нет ответа» (~10 сек) на номер OrzuX.",
      "Сохраните и проверьте тестовым звонком.",
    ],
  },
  {
    id: "telekom",
    label: "Telekom / оператор",
    steps: [
      "Откройте кабинет оператора (Telefoniecenter / app).",
      "Anrufweiterleitung → после 10–20 сек → номер OrzuX.",
      "Сохраните. Клиенты по-прежнему звонят на ваш старый номер.",
    ],
  },
  {
    id: "cloud",
    label: "Cloud PBX (Placetel, NFON…)",
    steps: [
      "В админке АТС добавьте Rufumleitung / Forward на номер OrzuX.",
      "Рекомендуем delay 10 сек, чтобы сначала могли взять трубку сами.",
      "Проверьте входящий вызов end-to-end.",
    ],
  },
] as const;

export function VoiceActivatePanel({
  connection,
  settings,
  config,
  availablePhoneNumbers,
  hasBusiness,
  embeddedInHub = false,
  forwardToE164 = null,
}: VoiceActivatePanelProps) {
  void config;
  void availablePhoneNumbers;
  const router = useRouter();
  const hasNumber = Boolean(connection.phoneNumber);
  const [countryCode, setCountryCode] = useState("DE");
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [available, setAvailable] = useState<TwilioAvailablePhoneNumber[]>([]);
  const [forwardTo, setForwardTo] = useState(forwardToE164 ?? "");
  const [savingForward, setSavingForward] = useState(false);
  const [guideId, setGuideId] = useState<(typeof FORWARDING_GUIDES)[number]["id"]>(
    "fritzbox",
  );
  const [testing, setTesting] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);

  const pricing = getTwilioCountryPricing(countryCode);
  const activeGuide =
    FORWARDING_GUIDES.find((guide) => guide.id === guideId) ?? FORWARDING_GUIDES[0];

  async function handleSearch() {
    setSearching(true);
    try {
      const result = await searchTwilioPhoneNumbersAction({
        countryCode,
        areaCode: areaCode.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.searchNumbersFailed);
        return;
      }
      setAvailable(result.numbers ?? []);
      if (!(result.numbers ?? []).length) {
        toast.message("Свободных номеров не найдено. Попробуйте другую страну.");
      }
    } finally {
      setSearching(false);
    }
  }

  async function handlePurchase(phoneNumber: string) {
    setPurchasing(phoneNumber);
    try {
      const result = await purchaseTwilioPhoneNumberAction({
        phoneNumber,
        countryCode,
      });
      if (!result.success) {
        toast.error(result.message ?? TWILIO_MESSAGES.purchaseNumberFailed);
        return;
      }
      toast.success(TWILIO_MESSAGES.buyNumberSuccess);
      router.refresh();
    } finally {
      setPurchasing(null);
    }
  }

  async function handleSaveForward() {
    setSavingForward(true);
    try {
      const result = await saveVoiceForwardToAction({ forwardToE164: forwardTo });
      if (!result.success) {
        toast.error(result.message ?? "Не удалось сохранить номер.");
        return;
      }
      toast.success("Номер для переадресации / handoff сохранён.");
      router.refresh();
    } finally {
      setSavingForward(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Скопировано");
  }

  async function handleTestCall() {
    if (!forwardTo.trim()) {
      toast.error("Сначала сохраните ваш личный номер (шаг 3).");
      return;
    }
    setTesting(true);
    try {
      const result = await triggerTestVoiceCallAction({
        phoneNumber: forwardTo.trim(),
      });
      if (!result.success) {
        toast.error(result.message ?? "Тестовый звонок не удался.");
        return;
      }
      toast.success("Тестовый звонок ИИ запущен.");
    } finally {
      setTesting(false);
    }
  }

  async function handleToggleAi() {
    setTogglingAi(true);
    try {
      const result = await toggleVoiceAiAction(!settings.aiEnabled);
      if (!result.success) {
        toast.error(result.message ?? "Не удалось переключить ИИ.");
        return;
      }
      router.refresh();
    } finally {
      setTogglingAi(false);
    }
  }

  if (!hasBusiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Сначала создайте бизнес</CardTitle>
          <CardDescription>
            После этого OrzuX выдаст номер для ИИ-звонков.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!hasNumber ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCallIcon className="size-5" />
              Получите номер OrzuX
            </CardTitle>
            <CardDescription>
              Как у Kiki: OrzuX выдаёт номер на своей телефонии. Вы ставите
              переадресацию со своего обычного номера — без Twilio Connect и без
              Softphone. Оплата номера и минут — через подписку OrzuX.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Страна</Label>
                <select
                  id="country"
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                >
                  {TWILIO_COUNTRY_PRICING.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label} · {formatMonthlyPrice(country.monthlyPriceCents)}/мес
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Код региона (необязательно)</Label>
                <Input
                  id="area"
                  value={areaCode}
                  onChange={(event) => setAreaCode(event.target.value)}
                  placeholder="например 30"
                />
              </div>
            </div>
            {pricing ? (
              <p className="text-muted-foreground text-sm">
                Номер: {formatMonthlyPrice(pricing.monthlyPriceCents)}/мес через
                Stripe. Минуты ИИ — по тарифу плана OrzuX.
              </p>
            ) : null}
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Найти номера
            </Button>
            {available.length > 0 ? (
              <ul className="space-y-2">
                {available.map((number) => (
                  <li
                    key={number.phoneNumber}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{number.phoneNumber}</p>
                      <p className="text-muted-foreground text-xs">
                        {[number.locality, number.region].filter(Boolean).join(", ") ||
                          "Доступен"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={purchasing === number.phoneNumber}
                      onClick={() => handlePurchase(number.phoneNumber)}
                    >
                      {purchasing === number.phoneNumber ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : null}
                      Купить и подключить
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Ваш номер OrzuX</CardTitle>
                <Badge variant="secondary">Активен</Badge>
              </div>
              <CardDescription>
                На этот номер отвечает ИИ. Клиенты могут звонить сюда напрямую
                или через переадресацию с вашего обычного номера.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <code className="bg-muted rounded-md px-3 py-2 text-lg font-semibold tracking-wide">
                  {connection.phoneNumber}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    connection.phoneNumber && handleCopy(connection.phoneNumber)
                  }
                >
                  <CopyIcon className="size-4" />
                  Копировать
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={settings.aiEnabled ? "default" : "outline"}
                  onClick={handleToggleAi}
                  disabled={togglingAi}
                >
                  {togglingAi ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2Icon className="size-4" />
                  )}
                  ИИ {settings.aiEnabled ? "включён" : "выключен"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestCall}
                  disabled={testing || !settings.outboundEnabled}
                >
                  {testing ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <PhoneCallIcon className="size-4" />
                  )}
                  Тест: ИИ позвонит вам
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Шаг 2 — Rufweiterleitung</CardTitle>
              <CardDescription>
                Переадресуйте свой обычный номер бизнеса на OrzuX с задержкой
                ~10 секунд — сначала можете взять трубку сами.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {FORWARDING_GUIDES.map((guide) => (
                  <Button
                    key={guide.id}
                    type="button"
                    size="sm"
                    variant={guideId === guide.id ? "default" : "outline"}
                    onClick={() => setGuideId(guide.id)}
                  >
                    {guide.label}
                  </Button>
                ))}
              </div>
              <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
                {activeGuide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="rounded-md border border-dashed p-3 text-sm">
                Ziel / цель переадресации:{" "}
                <strong>{connection.phoneNumber}</strong>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() =>
                    connection.phoneNumber && handleCopy(connection.phoneNumber)
                  }
                >
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Шаг 3 — Ваш личный номер (handoff)</CardTitle>
              <CardDescription>
                Если ИИ передаёт звонок человеку или ИИ выключен — OrzuX наберёт
                этот номер. Это не Softphone в браузере.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="forwardTo">Ваш мобильный / офис (E.164)</Label>
                <Input
                  id="forwardTo"
                  value={forwardTo}
                  onChange={(event) => setForwardTo(event.target.value)}
                  placeholder="+491701234567"
                />
              </div>
              <Button onClick={handleSaveForward} disabled={savingForward}>
                {savingForward ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Сохранить
              </Button>
            </CardContent>
          </Card>

          {!embeddedInHub ? (
            <IntegrationDangerZone
              resourceLabel="номер OrzuX"
              successMessage="Номер OrzuX отключён."
              onDisconnect={disconnectTwilioAction}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
