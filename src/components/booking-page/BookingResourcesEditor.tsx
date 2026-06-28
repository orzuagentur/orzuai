"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import type { BookingResourceEditorConfig } from "@/lib/calendar/business-type-presets";
import type { CalendarResourceType } from "@/types/business-calendar-resource.types";

export type EditableBookingResource = {
  clientId: string;
  id?: string;
  resourceType: CalendarResourceType;
  name: string;
  description: string;
  capacity: number;
  durationMinutes: number;
};

type BookingResourcesEditorProps = {
  resources: EditableBookingResource[];
  onChange: (resources: EditableBookingResource[]) => void;
  editorConfig: BookingResourceEditorConfig;
  defaultDurationMinutes?: number;
};

function createEmptyResource(
  config: BookingResourceEditorConfig,
  defaultDurationMinutes = 60,
): EditableBookingResource {
  return {
    clientId: crypto.randomUUID(),
    resourceType: config.defaultResourceType,
    name: "",
    description: "",
    capacity: config.showCapacity ? 2 : 1,
    durationMinutes: defaultDurationMinutes,
  };
}

export function BookingResourcesEditor({
  resources,
  onChange,
  editorConfig,
  defaultDurationMinutes = 60,
}: BookingResourcesEditorProps) {
  const showTypePicker = editorConfig.allowedResourceTypes.length > 1;

  function updateResource(
    clientId: string,
    patch: Partial<EditableBookingResource>,
  ) {
    onChange(
      resources.map((resource) =>
        resource.clientId === clientId ? { ...resource, ...patch } : resource,
      ),
    );
  }

  function removeResource(clientId: string) {
    if (resources.length <= 1) {
      return;
    }

    onChange(resources.filter((resource) => resource.clientId !== clientId));
  }

  function addResource() {
    onChange([
      ...resources,
      createEmptyResource(editorConfig, defaultDurationMinutes),
    ]);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{editorConfig.resourcesTitle}</p>
        <p className="text-xs text-muted-foreground">
          {editorConfig.resourcesSubtitle}
        </p>
      </div>

      <div className="space-y-2">
        {resources.map((resource, index) => (
          <div
            key={resource.clientId}
            className="rounded-lg border bg-card p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                #{index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={resources.length <= 1}
                aria-label={ORZUX_CALENDAR_MESSAGES.removeResource}
                onClick={() => removeResource(resource.clientId)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>

            <div className="grid gap-2">
              <div
                className={
                  showTypePicker || editorConfig.showDuration || editorConfig.showCapacity
                    ? "grid grid-cols-2 gap-2"
                    : "grid gap-2"
                }
              >
                <div className={showTypePicker ? "col-span-2 space-y-1" : "space-y-1"}>
                  <Label className="text-xs">{ORZUX_CALENDAR_MESSAGES.resourceName}</Label>
                  <Input
                    value={resource.name}
                    onChange={(event) =>
                      updateResource(resource.clientId, { name: event.target.value })
                    }
                    placeholder={editorConfig.namePlaceholder}
                    className="h-8 text-sm"
                  />
                </div>

                {showTypePicker ? (
                  <div className="space-y-1">
                    <Label className="text-xs">{ORZUX_CALENDAR_MESSAGES.resourceType}</Label>
                    <select
                      value={resource.resourceType}
                      onChange={(event) =>
                        updateResource(resource.clientId, {
                          resourceType: event.target.value as CalendarResourceType,
                        })
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {editorConfig.allowedResourceTypes.map((type) => (
                        <option key={type} value={type}>
                          {ORZUX_CALENDAR_MESSAGES.resourceTypes[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {editorConfig.showDuration ? (
                  <div className="space-y-1">
                    <Label className="text-xs">{ORZUX_CALENDAR_MESSAGES.resourceDuration}</Label>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={resource.durationMinutes}
                      onChange={(event) =>
                        updateResource(resource.clientId, {
                          durationMinutes: Number(event.target.value),
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ) : null}

                {editorConfig.showCapacity ? (
                  <div className="space-y-1">
                    <Label className="text-xs">{ORZUX_CALENDAR_MESSAGES.resourceCapacity}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={resource.capacity}
                      onChange={(event) =>
                        updateResource(resource.clientId, {
                          capacity: Number(event.target.value),
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={addResource}
      >
        <PlusIcon className="size-4" />
        {ORZUX_CALENDAR_MESSAGES.addResource}
      </Button>
    </div>
  );
}

export function mapResourcesToEditable(
  resources: Array<{
    id: string;
    resourceType: CalendarResourceType;
    name: string;
    description: string;
    capacity: number;
    durationMinutes: number;
  }>,
  config: BookingResourceEditorConfig,
  defaultDurationMinutes = 60,
): EditableBookingResource[] {
  if (resources.length === 0) {
    return [createEmptyResource(config, defaultDurationMinutes)];
  }

  return resources.map((resource) => ({
    clientId: resource.id,
    id: resource.id,
    resourceType: config.allowedResourceTypes.includes(resource.resourceType)
      ? resource.resourceType
      : config.defaultResourceType,
    name: resource.name,
    description: resource.description,
    capacity: resource.capacity,
    durationMinutes: resource.durationMinutes,
  }));
}

export function createResourcesFromPreset(
  presetResources: Array<{
    resourceType: CalendarResourceType;
    name: string;
    description: string;
    capacity: number;
    durationMinutes: number;
  }>,
): EditableBookingResource[] {
  return presetResources.map((resource) => ({
    clientId: crypto.randomUUID(),
    resourceType: resource.resourceType,
    name: resource.name,
    description: resource.description,
    capacity: resource.capacity,
    durationMinutes: resource.durationMinutes,
  }));
}
