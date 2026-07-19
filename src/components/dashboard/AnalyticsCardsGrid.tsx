"use client";

import { useCallback, useRef, useState } from "react";

import { InteractiveAnalyticsCard } from "@/components/dashboard/InteractiveAnalyticsCard";
import {
  DASHBOARD_CARD_SLOTS,
  type DashboardCardSlotConfig,
} from "@/features/dashboard/metric-cards";
import type {
  DashboardCardMetricKey,
  DashboardCardMetricValues,
  DashboardCardPeriod,
  DashboardCardSlotId,
} from "@/types/dashboard-home.types";

type AnalyticsCardsGridProps = {
  initialPeriod?: DashboardCardPeriod;
  initialValues: DashboardCardMetricValues;
};

type SlotState = {
  period: DashboardCardPeriod;
  variantId: DashboardCardMetricKey;
};

function buildInitialSlotState(
  period: DashboardCardPeriod,
): Record<DashboardCardSlotId, SlotState> {
  return Object.fromEntries(
    DASHBOARD_CARD_SLOTS.map((slot) => [
      slot.id,
      { period, variantId: slot.defaultVariant },
    ]),
  ) as Record<DashboardCardSlotId, SlotState>;
}

function findVariant(slot: DashboardCardSlotConfig, variantId: string) {
  return (
    slot.variants.find((variant) => variant.id === variantId) ??
    slot.variants[0]!
  );
}

export function AnalyticsCardsGrid({
  initialPeriod = "week",
  initialValues,
}: AnalyticsCardsGridProps) {
  const [slotState, setSlotState] = useState(() =>
    buildInitialSlotState(initialPeriod),
  );
  const [valuesByPeriod, setValuesByPeriod] = useState<
    Partial<Record<DashboardCardPeriod, DashboardCardMetricValues>>
  >({ [initialPeriod]: initialValues });
  const [loadingPeriods, setLoadingPeriods] = useState<
    Partial<Record<DashboardCardPeriod, boolean>>
  >({});
  const valuesRef = useRef(valuesByPeriod);
  valuesRef.current = valuesByPeriod;

  const ensurePeriod = useCallback(
    async (period: DashboardCardPeriod) => {
      if (valuesRef.current[period]) {
        return valuesRef.current[period]!;
      }

      setLoadingPeriods((current) => ({ ...current, [period]: true }));

      try {
        const response = await fetch(
          `/api/analytics/dashboard-cards?period=${period}`,
        );
        const payload = (await response.json()) as {
          success: boolean;
          values?: DashboardCardMetricValues;
        };

        if (response.ok && payload.success && payload.values) {
          setValuesByPeriod((current) => ({
            ...current,
            [period]: payload.values,
          }));
          return payload.values;
        }
      } finally {
        setLoadingPeriods((current) => ({ ...current, [period]: false }));
      }

      return valuesRef.current[initialPeriod] ?? initialValues;
    },
    [initialPeriod, initialValues],
  );

  const handlePeriodChange = useCallback(
    (slotId: DashboardCardSlotId, period: DashboardCardPeriod) => {
      setSlotState((current) => ({
        ...current,
        [slotId]: { ...current[slotId], period },
      }));
      void ensurePeriod(period);
    },
    [ensurePeriod],
  );

  const handleVariantChange = useCallback(
    (slotId: DashboardCardSlotId, variantId: string) => {
      const slot = DASHBOARD_CARD_SLOTS.find((item) => item.id === slotId);
      if (!slot) return;
      const variant = findVariant(slot, variantId);
      setSlotState((current) => ({
        ...current,
        [slotId]: { ...current[slotId], variantId: variant.id },
      }));
    },
    [],
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
      {DASHBOARD_CARD_SLOTS.map((slot) => {
        const state = slotState[slot.id];
        const variant = findVariant(slot, state.variantId);
        const values =
          valuesByPeriod[state.period] ??
          valuesByPeriod[initialPeriod] ??
          initialValues;

        return (
          <InteractiveAnalyticsCard
            key={slot.id}
            href={slot.href}
            value={values[variant.id]}
            period={state.period}
            variants={slot.variants}
            activeVariant={variant}
            isLoading={Boolean(loadingPeriods[state.period])}
            onPeriodChange={(period) => handlePeriodChange(slot.id, period)}
            onVariantChange={(variantId) =>
              handleVariantChange(slot.id, variantId)
            }
          />
        );
      })}
    </div>
  );
}
