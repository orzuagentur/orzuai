"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import {
  createCustomBookingFormField,
  type BookingFormField,
} from "@/lib/calendar/booking-form-fields";

type BookingFormFieldsEditorProps = {
  fields: BookingFormField[];
  onChange: (fields: BookingFormField[]) => void;
};

export function BookingFormFieldsEditor({
  fields,
  onChange,
}: BookingFormFieldsEditorProps) {
  function updateField(id: string, patch: Partial<BookingFormField>) {
    onChange(
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  }

  function removeField(id: string) {
    onChange(fields.filter((field) => field.id !== id || field.system));
  }

  function addField() {
    onChange([...fields, createCustomBookingFormField("")]);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{ORZUX_CALENDAR_MESSAGES.bookingFormTitle}</p>
        <p className="text-xs text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.bookingFormSubtitle}
        </p>
      </div>

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">{ORZUX_CALENDAR_MESSAGES.formFieldLabel}</Label>
                  <Input
                    value={field.label}
                    disabled={field.system}
                    onChange={(event) =>
                      updateField(field.id, { label: event.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>

                {field.system ? (
                  <p className="text-[11px] text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.systemFieldHint}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">{ORZUX_CALENDAR_MESSAGES.formFieldType}</Label>
                    <select
                      value={field.type}
                      onChange={(event) =>
                        updateField(field.id, {
                          type: event.target.value as BookingFormField["type"],
                        })
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="text">{ORZUX_CALENDAR_MESSAGES.formFieldTypeText}</option>
                      <option value="textarea">{ORZUX_CALENDAR_MESSAGES.formFieldTypeTextarea}</option>
                      <option value="phone">{ORZUX_CALENDAR_MESSAGES.formFieldTypePhone}</option>
                    </select>
                  </div>
                )}
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
                  {ORZUX_CALENDAR_MESSAGES.formFieldRequired}
                </label>

                {!field.system ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={ORZUX_CALENDAR_MESSAGES.removeFormField}
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addField}>
        <PlusIcon className="size-4" />
        {ORZUX_CALENDAR_MESSAGES.addFormField}
      </Button>
    </div>
  );
}
