"use client";

import { useEffect, useState } from "react";
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
import { getOrderSourceLabel, ORDERS_MESSAGES } from "@/features/orders/constants";
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
};

export function CreateOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrderDialogProps) {
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<ContactPickerItem[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<CrmOrderManualSource>("manual");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setContactSearch("");
    setContacts([]);
    setSelectedContactId(null);
    setCustomerName("");
    setPhone("");
    setEmail("");
    setTitle("");
    setServiceType("");
    setDescription("");
    setAmount("");
    setSource("manual");
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      void searchContactsForPickerAction(contactSearch)
        .then((result) => setContacts(result.data))
        .finally(() => setIsSearching(false));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [contactSearch, open]);

  function handleSelectContact(contact: ContactPickerItem) {
    setSelectedContactId(contact.id);
    setCustomerName(contact.name);
    setPhone(contact.phone);
  }

  async function handleSubmit() {
    if (!customerName.trim() || !title.trim()) {
      toast.error(ORDERS_MESSAGES.createFailed);
      return;
    }

    setIsSaving(true);

    try {
      const parsedAmount = amount.trim() ? Number.parseFloat(amount) : null;
      const result = await createManualCrmOrderAction({
        contactId: selectedContactId,
        customerName: customerName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        title: title.trim(),
        serviceType: serviceType.trim() || null,
        description: description.trim() || null,
        amount:
          parsedAmount !== null && Number.isFinite(parsedAmount)
            ? parsedAmount
            : null,
        source,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(ORDERS_MESSAGES.createSuccess);
      const orderId = result.data?.orderId;
      resetForm();
      onOpenChange(false);
      if (orderId) {
        onCreated(orderId);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetForm();
        }
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

          <div className="space-y-2">
            <Label htmlFor="order-customer-name">
              {ORDERS_MESSAGES.customerNameLabel}
            </Label>
            <Input
              id="order-customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order-phone">{ORDERS_MESSAGES.phoneLabel}</Label>
              <Input
                id="order-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-email">{ORDERS_MESSAGES.emailLabel}</Label>
              <Input
                id="order-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-source">{ORDERS_MESSAGES.sourceLabel}</Label>
            <select
              id="order-source"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={source}
              onChange={(event) =>
                setSource(event.target.value as CrmOrderManualSource)
              }
            >
              {CRM_ORDER_MANUAL_SOURCES.map((value) => (
                <option key={value} value={value}>
                  {getOrderSourceLabel(value)}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <OrderSourceIcon source={source} />
              <span>{getOrderSourceLabel(source)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-title">{ORDERS_MESSAGES.orderTitleLabel}</Label>
            <Input
              id="order-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-service">{ORDERS_MESSAGES.serviceTypeLabel}</Label>
            <Input
              id="order-service"
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
              placeholder={ORDERS_MESSAGES.serviceTypePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-description">
              {ORDERS_MESSAGES.descriptionLabel}
            </Label>
            <Textarea
              id="order-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-amount">{ORDERS_MESSAGES.amountLabel}</Label>
            <Input
              id="order-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
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
