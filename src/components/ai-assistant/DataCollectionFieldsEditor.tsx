"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COLLECTION_NICHE_LABELS,
  DATA_COLLECTION_CRM_MAPS,
  DATA_COLLECTION_FIELD_TYPES,
  getCollectionNichePreset,
  type CollectionNiche,
  type DataCollectionField,
  type DataCollectionFieldType,
} from "@/lib/ai/data-collection";

type DataCollectionFieldsEditorProps = {
  niche: CollectionNiche;
  fields: DataCollectionField[];
  onNicheChange: (niche: CollectionNiche) => void;
  onFieldsChange: (fields: DataCollectionField[]) => void;
};

const FIELD_TYPE_LABELS: Record<DataCollectionFieldType, string> = {
  text: "Text",
  textarea: "Long text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  date: "Date",
  datetime: "Date & time",
  select: "Select",
  checkbox: "Checkbox",
  url: "URL",
};

const CRM_MAP_LABELS: Record<(typeof DATA_COLLECTION_CRM_MAPS)[number], string> = {
  name: "CRM name",
  email: "CRM email",
  phone: "CRM phone",
  company: "CRM company",
  location: "CRM location",
  dealValue: "CRM deal value",
  expectedCloseDate: "CRM close date",
  custom: "Custom (collection only)",
};

function slugifyKey(label: string): string {
  const base = label
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1");
  return base.slice(0, 40) || `field_${Date.now().toString(36)}`;
}

function createEmptyField(): DataCollectionField {
  const id = `custom_${Date.now().toString(36)}`;
  return {
    id,
    key: id,
    label: "New field",
    type: "text",
    required: false,
    crmMap: "custom",
  };
}

export function DataCollectionFieldsEditor({
  niche,
  fields,
  onNicheChange,
  onFieldsChange,
}: DataCollectionFieldsEditorProps) {
  function updateField(id: string, patch: Partial<DataCollectionField>) {
    onFieldsChange(
      fields.map((field) => {
        if (field.id !== id) return field;
        const next = { ...field, ...patch };
        if (patch.label && field.key === field.id) {
          next.key = slugifyKey(patch.label);
        }
        return next;
      }),
    );
  }

  function applyPreset() {
    const ok =
      fields.length === 0 ||
      window.confirm(
        "Replace current fields with the niche preset? Unsaved custom fields will be lost.",
      );
    if (!ok) return;
    onFieldsChange(getCollectionNichePreset(niche));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="collection-niche">Business niche</Label>
          <select
            id="collection-niche"
            value={niche}
            onChange={(event) =>
              onNicheChange(event.target.value as CollectionNiche)
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {(Object.keys(COLLECTION_NICHE_LABELS) as CollectionNiche[]).map(
              (key) => (
                <option key={key} value={key}>
                  {COLLECTION_NICHE_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={applyPreset}>
            Apply niche preset
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        AI asks only for missing values, writes answers into CRM / collection
        fields, then runs tools when required data is complete.
      </p>

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.id} className="rounded-lg border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={field.label}
                    onChange={(event) =>
                      updateField(field.id, { label: event.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Input
                      value={field.key}
                      onChange={(event) =>
                        updateField(field.id, {
                          key: slugifyKey(event.target.value),
                        })
                      }
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={field.type}
                      onChange={(event) =>
                        updateField(field.id, {
                          type: event.target.value as DataCollectionFieldType,
                        })
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {DATA_COLLECTION_FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {FIELD_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CRM map</Label>
                    <select
                      value={field.crmMap}
                      onChange={(event) =>
                        updateField(field.id, {
                          crmMap: event.target
                            .value as DataCollectionField["crmMap"],
                        })
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {DATA_COLLECTION_CRM_MAPS.map((map) => (
                        <option key={map} value={map}>
                          {CRM_MAP_LABELS[map]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {field.type === "select" ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Options (comma-separated)</Label>
                    <Input
                      value={(field.options ?? []).join(", ")}
                      onChange={(event) =>
                        updateField(field.id, {
                          options: event.target.value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean),
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(field.id, { required: event.target.checked })
                    }
                  />
                  Required
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() =>
                    onFieldsChange(fields.filter((item) => item.id !== field.id))
                  }
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onFieldsChange([...fields, createEmptyField()])}
      >
        <PlusIcon className="mr-1.5 h-4 w-4" />
        Add field
      </Button>
    </div>
  );
}
