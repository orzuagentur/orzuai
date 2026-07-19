"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { OrderSourceIcon } from "@/components/orders/OrderSourceIcon";
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
import { Textarea } from "@/components/ui/textarea";
import { searchContactsForPickerAction } from "@/features/contacts/actions/search-contacts-for-picker";
import { createManualCrmOrderAction } from "@/features/orders/actions/create-manual-order";
import {
  getOrderSourceLabel,
  ORDERS_MESSAGES,
} from "@/features/orders/constants";
import {
  getEnabledOrderFormFields,
  getFieldSelectableOptions,
  type OrderFormField,
} from "@/features/orders/order-form-fields";
import { cn } from "@/lib/utils";
import type { ContactPickerItem } from "@/types/crm-deal.types";
import {
  CRM_ORDER_MANUAL_SOURCES,
  type CrmOrderManualSource,
} from "@/types/crm-order.types";

type CreateOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (orderId: string) => void;
  formFields: OrderFormField[];
};

export function CreateOrderDialog({
  open,
  onOpenChange,
  onCreated,
  formFields,
}: CreateOrderDialogProps) {
  const enabledFields = useMemo(
    () => getEnabledOrderFormFields(formFields),
    [formFields],
  );

  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<ContactPickerItem[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [source, setSource] = useState<CrmOrderManualSource>("manual");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setContactSearch("");
    setContacts([]);
    setSelectedContactId(null);
    setValues({});
    setSource("manual");
  }

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      void searchContactsForPickerAction(contactSearch)
        .then((result) => setContacts(result.data))
        .finally(() => setIsSearching(false));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [contactSearch, open]);

  function setFieldValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSelectContact(contact: ContactPickerItem) {
    setSelectedContactId(contact.id);
    setValues((current) => ({
      ...current,
      customerName: contact.name,
      phone: contact.phone,
    }));
  }

  async function handleSubmit() {
    const customFields: Record<string, string> = {};
    for (const field of enabledFields) {
      if (field.builtIn) continue;
      const value = values[field.key]?.trim() ?? "";
      if (value) customFields[field.key] = value;
    }

    for (const field of enabledFields) {
      if (!field.required) continue;
      const value =
        field.key === "source"
          ? source
          : (values[field.key]?.trim() ?? "");
      if (!value) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }

    const amountRaw = values.amount?.trim() ?? "";
    const parsedAmount = amountRaw ? Number.parseFloat(amountRaw) : null;

    const hasAny =
      Boolean(values.customerName?.trim()) ||
      Boolean(values.phone?.trim()) ||
      Boolean(values.email?.trim()) ||
      Boolean(values.title?.trim()) ||
      Boolean(values.serviceType?.trim()) ||
      Boolean(values.description?.trim()) ||
      (parsedAmount !== null && Number.isFinite(parsedAmount)) ||
      Object.keys(customFields).length > 0;

    if (!hasAny) {
      toast.error(ORDERS_MESSAGES.formAtLeastOne);
      return;
    }

    setIsSaving(true);
    try {
      const result = await createManualCrmOrderAction({
        contactId: selectedContactId,
        customerName: values.customerName?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        title: values.title?.trim() || null,
        serviceType: values.serviceType?.trim() || null,
        description: values.description?.trim() || null,
        amount:
          parsedAmount !== null && Number.isFinite(parsedAmount)
            ? parsedAmount
            : null,
        source,
        customFields,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(ORDERS_MESSAGES.createSuccess);
      const orderId = result.data?.orderId;
      resetForm();
      onOpenChange(false);
      if (orderId) onCreated(orderId);
    } finally {
      setIsSaving(false);
    }
  }

  function renderField(field: OrderFormField) {
    const requiredMark = field.required ? " *" : "";
    const value = values[field.key] ?? "";
    const selectableOptions = getFieldSelectableOptions(field);

    if (field.key === "source") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={`order-${field.key}`}>
            {field.label}
            {requiredMark}
          </Label>
          <select
            id={`order-${field.key}`}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={source}
            onChange={(event) =>
              setSource(event.target.value as CrmOrderManualSource)
            }
          >
            {CRM_ORDER_MANUAL_SOURCES.map((entry) => (
              <option key={entry} value={entry}>
                {getOrderSourceLabel(entry)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <OrderSourceIcon source={source} />
            <span>{getOrderSourceLabel(source)}</span>
          </div>
        </div>
      );
    }

    if (selectableOptions) {
      const isKnownOption = selectableOptions.includes(value);
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={`order-${field.key}`}>
            {field.label}
            {requiredMark}
          </Label>
          <select
            id={`order-${field.key}`}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={isKnownOption ? value : ""}
            onChange={(event) => setFieldValue(field.key, event.target.value)}
          >
            <option value="">{ORDERS_MESSAGES.formSelectOption}</option>
            {selectableOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Input
            value={isKnownOption ? "" : value}
            onChange={(event) => setFieldValue(field.key, event.target.value)}
            placeholder={ORDERS_MESSAGES.formOrTypeCustom}
          />
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={`order-${field.key}`}>
            {field.label}
            {requiredMark}
          </Label>
          <Textarea
            id={`order-${field.key}`}
            value={value}
            onChange={(event) => setFieldValue(field.key, event.target.value)}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={`order-${field.key}`}>
          {field.label}
          {requiredMark}
        </Label>
        <Input
          id={`order-${field.key}`}
          type={
            field.type === "email"
              ? "email"
              : field.type === "number"
                ? "text"
                : "text"
          }
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(event) => setFieldValue(field.key, event.target.value)}
        />
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ORDERS_MESSAGES.createTitle}</DialogTitle>
          <DialogDescription>{ORDERS_MESSAGES.createDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-1">
          <div className="space-y-2">
            <Label htmlFor="order-contact-search">
              {ORDERS_MESSAGES.contactSearchLabel}
            </Label>
            <Input
              id="order-contact-search"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder={ORDERS_MESSAGES.contactSearchPlaceholder}
            />
            {isSearching ? (
              <p className="text-xs text-muted-foreground">Searching…</p>
            ) : contacts.length > 0 ? (
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-1">
                {contacts.slice(0, 8).map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                        selectedContactId === contact.id && "bg-muted",
                      )}
                      onClick={() => handleSelectContact(contact)}
                    >
                      <span className="truncate font-medium">{contact.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {contact.phone}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {enabledFields.map((field) => renderField(field))}
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
          <Button type="button" disabled={isSaving} onClick={() => void handleSubmit()}>
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              ORDERS_MESSAGES.saveOrder
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
