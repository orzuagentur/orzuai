"use client";

import { LocationAutocomplete } from "@/components/contacts/LocationAutocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { PipelineStage } from "@/types/contact.types";
import { PIPELINE_STAGES } from "@/types/contact.types";
import type { ContactCrmFormValues } from "@/utils/contact-crm-form";
import { cn } from "@/lib/utils";

type ContactCrmFieldsFormProps = {
  values: ContactCrmFormValues;
  onChange: (field: keyof ContactCrmFormValues, value: string) => void;
  compact?: boolean;
  idPrefix?: string;
  className?: string;
};

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

export function ContactCrmFieldsForm({
  values,
  onChange,
  compact = false,
  idPrefix = "contact",
  className,
}: ContactCrmFieldsFormProps) {
  return (
    <div className={cn(compact ? "space-y-3" : "space-y-4", className)}>
      {!compact ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            id={`${idPrefix}-name`}
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>{CONTACTS_MESSAGES.emailLabel}</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-tags`}>{CONTACTS_MESSAGES.tagsLabel}</Label>
        <Input
          id={`${idPrefix}-tags`}
          value={values.tagsInput}
          onChange={(event) => onChange("tagsInput", event.target.value)}
          placeholder={CONTACTS_MESSAGES.tagsHint}
        />
      </div>
      <div className={cn(compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-company`}>
            {CONTACTS_MESSAGES.companyLabel}
          </Label>
          <Input
            id={`${idPrefix}-company`}
            value={values.company}
            onChange={(event) => onChange("company", event.target.value)}
          />
        </div>
        <LocationAutocomplete
          id={`${idPrefix}-location`}
          label={CONTACTS_MESSAGES.locationLabel}
          value={values.location}
          onChange={(value) => onChange("location", value)}
          placeholder={CONTACTS_MESSAGES.locationSearchPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-pipeline-stage`}>
          {CONTACTS_MESSAGES.pipelineStageLabel}
        </Label>
        <select
          id={`${idPrefix}-pipeline-stage`}
          value={values.pipelineStage}
          onChange={(event) => onChange("pipelineStage", event.target.value)}
          className="border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {PIPELINE_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </div>
      <div className={cn(compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-deal-value`}>
            {CONTACTS_MESSAGES.dealValueLabel}
          </Label>
          <Input
            id={`${idPrefix}-deal-value`}
            type="number"
            min="0"
            value={values.dealValue}
            onChange={(event) => onChange("dealValue", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-close-date`}>
            {CONTACTS_MESSAGES.expectedCloseLabel}
          </Label>
          <Input
            id={`${idPrefix}-close-date`}
            type="date"
            value={values.expectedCloseDate}
            onChange={(event) => onChange("expectedCloseDate", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>{CONTACTS_MESSAGES.notesLabel}</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={values.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          rows={compact ? 2 : 3}
        />
      </div>
    </div>
  );
}
