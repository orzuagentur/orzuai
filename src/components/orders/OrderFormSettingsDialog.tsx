"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  importOrderFormOptionsFromKnowledgeAction,
  saveOrderFormFieldsAction,
} from "@/features/orders/actions/order-form-fields";
import {
  formatOrderFormImportSuccess,
  ORDERS_MESSAGES,
} from "@/features/orders/constants";
import {
  ORDER_FORM_FIELD_CATALOG,
  ORDER_FORM_OPTION_MAX,
  fieldSupportsOptions,
  getKbImportKindForField,
  mergeOrderFormOptions,
  type OrderFormField,
  type OrderFormFieldType,
  type OrderFormKbImportKind,
} from "@/features/orders/order-form-fields";
import { cn } from "@/lib/utils";

type OrderFormSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFields: OrderFormField[];
  onSaved: (fields: OrderFormField[]) => void;
};

const TYPE_LABELS: Record<OrderFormFieldType, string> = {
  text: "Text",
  textarea: "Long text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  select: "Select",
};

function slugifyKey(label: string): string {
  const base = label
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1");
  return base.slice(0, 40) || `field_${Date.now().toString(36)}`;
}

export function OrderFormSettingsDialog({
  open,
  onOpenChange,
  initialFields,
  onSaved,
}: OrderFormSettingsDialogProps) {
  const [fields, setFields] = useState<OrderFormField[]>(initialFields);
  const [isSaving, setIsSaving] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [importingFieldId, setImportingFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFields(initialFields);
      setOptionDrafts({});
      setImportingFieldId(null);
    }
  }, [open, initialFields]);

  const usedBuiltinKeys = useMemo(
    () => new Set(fields.filter((field) => field.builtIn).map((field) => field.key)),
    [fields],
  );

  const availableCatalog = ORDER_FORM_FIELD_CATALOG.filter(
    (entry) => !usedBuiltinKeys.has(entry.key),
  );

  function updateField(id: string, patch: Partial<OrderFormField>) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  }

  function addBuiltin(key: string) {
    const catalog = ORDER_FORM_FIELD_CATALOG.find((entry) => entry.key === key);
    if (!catalog) return;
    setFields((current) => [
      ...current,
      {
        id: `builtin_${catalog.key}_${Date.now().toString(36)}`,
        key: catalog.key,
        label: catalog.label,
        type: catalog.type,
        required: false,
        enabled: true,
        builtIn: true,
      },
    ]);
  }

  function addCustom() {
    const id = `custom_${Date.now().toString(36)}`;
    setFields((current) => [
      ...current,
      {
        id,
        key: id,
        label: "Custom field",
        type: "select",
        required: false,
        enabled: true,
        builtIn: false,
        options: [],
      },
    ]);
  }

  function removeField(id: string) {
    setFields((current) => current.filter((field) => field.id !== id));
  }

  function addOption(fieldId: string) {
    const draft = optionDrafts[fieldId]?.trim() ?? "";
    if (!draft) return;
    const field = fields.find((entry) => entry.id === fieldId);
    if (!field) return;
    if ((field.options?.length ?? 0) >= ORDER_FORM_OPTION_MAX) {
      toast.error(`Maximum ${ORDER_FORM_OPTION_MAX} options.`);
      return;
    }
    updateField(fieldId, {
      options: mergeOrderFormOptions(field.options, [draft]),
    });
    setOptionDrafts((current) => ({ ...current, [fieldId]: "" }));
  }

  function removeOption(fieldId: string, option: string) {
    const field = fields.find((entry) => entry.id === fieldId);
    if (!field?.options) return;
    updateField(fieldId, {
      options: field.options.filter((entry) => entry !== option),
    });
  }

  async function handleImportFromKnowledge(
    fieldId: string,
    kind: OrderFormKbImportKind,
  ) {
    setImportingFieldId(fieldId);
    try {
      const result = await importOrderFormOptionsFromKnowledgeAction(kind);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.importedCount === 0) {
        toast.message(ORDERS_MESSAGES.formImportEmpty);
        return;
      }
      setFields((current) =>
        current.map((field) => {
          if (field.id !== fieldId) return field;
          return {
            ...field,
            options: mergeOrderFormOptions(field.options, result.options),
          };
        }),
      );
      toast.success(formatOrderFormImportSuccess(result.importedCount));
    } finally {
      setImportingFieldId(null);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const usedKeys = new Set<string>();
      const normalized = fields.map((field) => {
        if (field.builtIn) {
          usedKeys.add(field.key);
          return field;
        }

        let key = field.key;
        const looksAuto =
          key.startsWith("custom_") || key === field.id || !/^[a-zA-Z]/.test(key);
        if (looksAuto) {
          key = slugifyKey(field.label) || field.key;
        }

        let unique = key;
        let suffix = 2;
        while (usedKeys.has(unique)) {
          unique = `${key}_${suffix}`;
          suffix += 1;
        }
        usedKeys.add(unique);
        return { ...field, key: unique };
      });
      const result = await saveOrderFormFieldsAction(normalized);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(ORDERS_MESSAGES.formSettingsSaved);
      onSaved(result.fields);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setFields(initialFields);
          setOptionDrafts({});
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{ORDERS_MESSAGES.formSettingsTitle}</DialogTitle>
          <DialogDescription>
            {ORDERS_MESSAGES.formSettingsDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
          {fields.map((field) => {
            const supportsOptions = fieldSupportsOptions(field);
            const kbKind = getKbImportKindForField(field);
            const options = field.options ?? [];

            return (
              <div
                key={field.id}
                className="space-y-2 rounded-xl border bg-muted/20 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {field.builtIn ? "Ready-made" : "Custom"} ·{" "}
                      {TYPE_LABELS[field.type]}
                    </Label>
                    <Input
                      value={field.label}
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    onClick={() => removeField(field.id)}
                    aria-label="Remove field"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>

                {!field.builtIn ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={field.type}
                      onChange={(event) =>
                        updateField(field.id, {
                          type: event.target.value as OrderFormFieldType,
                        })
                      }
                    >
                      {(Object.keys(TYPE_LABELS) as OrderFormFieldType[]).map(
                        (type) => (
                          <option key={type} value={type}>
                            {TYPE_LABELS[type]}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={(event) =>
                        updateField(field.id, { enabled: event.target.checked })
                      }
                    />
                    {ORDERS_MESSAGES.formEnabled}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        updateField(field.id, { required: event.target.checked })
                      }
                    />
                    {ORDERS_MESSAGES.formRequired}
                  </label>
                </div>

                {supportsOptions ? (
                  <div className="space-y-2 rounded-lg border border-dashed bg-background/60 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {ORDERS_MESSAGES.formOptionsLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ORDERS_MESSAGES.formOptionsHint}
                        </p>
                      </div>
                      {kbKind ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={importingFieldId === field.id}
                          onClick={() =>
                            void handleImportFromKnowledge(field.id, kbKind)
                          }
                        >
                          {importingFieldId === field.id ? (
                            <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <BookOpenIcon className="mr-1.5 size-3.5" />
                          )}
                          {kbKind === "prices"
                            ? ORDERS_MESSAGES.formImportFromKbPrices
                            : ORDERS_MESSAGES.formImportFromKbServices}
                        </Button>
                      ) : null}
                    </div>

                    {options.length > 0 ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {options.map((option) => (
                          <li
                            key={option}
                            className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                          >
                            <span className="truncate">{option}</span>
                            <button
                              type="button"
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Remove ${option}`}
                              onClick={() => removeOption(field.id, option)}
                            >
                              <XIcon className="size-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No options yet — add manually or import from Knowledge.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Input
                        value={optionDrafts[field.id] ?? ""}
                        onChange={(event) =>
                          setOptionDrafts((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addOption(field.id);
                          }
                        }}
                        placeholder={ORDERS_MESSAGES.formOptionPlaceholder}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => addOption(field.id)}
                      >
                        {ORDERS_MESSAGES.formAddOption}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-1">
            {availableCatalog.length > 0 ? (
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) {
                    addBuiltin(event.target.value);
                    event.target.value = "";
                  }
                }}
              >
                <option value="" disabled>
                  {ORDERS_MESSAGES.formAddBuiltin}
                </option>
                {availableCatalog.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={addCustom}>
              <PlusIcon className="mr-1.5 size-4" />
              {ORDERS_MESSAGES.formAddCustom}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            {ORDERS_MESSAGES.cancel}
          </Button>
          <Button
            type="button"
            disabled={isSaving || fields.length === 0}
            onClick={() => void handleSave()}
            className={cn(fields.length === 0 && "opacity-60")}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              ORDERS_MESSAGES.formSettingsSave
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
