import {
  ArmchairIcon,
  BedDoubleIcon,
  LayoutGridIcon,
  SparklesIcon,
  UserIcon,
  UtensilsIcon,
} from "lucide-react";

import { SetupCalendarFromKnowledgeButton } from "@/components/google-calendar/SetupCalendarFromKnowledgeButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  BusinessBookingSetup,
  BusinessCalendarResource,
  CalendarResourceType,
} from "@/types/business-calendar-resource.types";

type BusinessCalendarResourcesPanelProps = {
  setup: BusinessBookingSetup | null;
  resources: BusinessCalendarResource[];
};

function resourceTypeIcon(type: CalendarResourceType) {
  switch (type) {
    case "room":
      return BedDoubleIcon;
    case "table":
      return UtensilsIcon;
    case "staff":
      return UserIcon;
    case "chair":
      return ArmchairIcon;
    case "service":
      return SparklesIcon;
    default:
      return LayoutGridIcon;
  }
}

function resourceTypeLabel(type: CalendarResourceType): string {
  switch (type) {
    case "room":
      return "Номер";
    case "table":
      return "Столик";
    case "staff":
      return "Мастер";
    case "chair":
      return "Кресло";
    case "service":
      return "Услуга";
    default:
      return "Ресурс";
  }
}

function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    return "сутки";
  }

  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} ч`;
  }

  return `${minutes} мин`;
}

export function BusinessCalendarResourcesPanel({
  setup,
  resources,
}: BusinessCalendarResourcesPanelProps) {
  const hasResources = resources.length > 0;

  return (
    <Card className="border bg-card shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {hasResources
              ? setup?.businessTypeLabel ?? "Календарь бронирования"
              : "Настроить календарь"}
          </CardTitle>
          <CardDescription>
            {hasResources
              ? `${resources.length} ресурсов для ИИ-агента. Гостиница — номера, ресторан — столики, барбершоп — мастера.`
              : "orzuAI прочитает базу знаний и создаст номера, столики или мастеров автоматически."}
          </CardDescription>
        </div>
        <SetupCalendarFromKnowledgeButton />
      </CardHeader>
      {hasResources ? (
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => {
              const Icon = resourceTypeIcon(resource.resourceType);

              return (
                <li
                  key={resource.id}
                  className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{resource.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {resourceTypeLabel(resource.resourceType)} ·{" "}
                      {formatDuration(resource.durationMinutes)}
                      {resource.capacity > 1
                        ? ` · до ${resource.capacity} гостей`
                        : ""}
                    </p>
                    {resource.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {resource.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {setup?.operatingHoursNote ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Часы работы: {setup.operatingHoursNote}
            </p>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
