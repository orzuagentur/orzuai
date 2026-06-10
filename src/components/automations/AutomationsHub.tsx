"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { AiAutomationPanel } from "@/components/ai-assistant/AiAutomationPanel";
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
import { createAutomationAction } from "@/features/automations/actions/save-automation";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TEMPLATES,
  AUTOMATION_TRIGGERS,
  AUTOMATIONS_MESSAGES,
} from "@/features/automations/constants";
import type {
  AutomationItem,
  AutomationsPageData,
  SaveAutomationInput,
} from "@/types/automations.types";

type AutomationsHubProps = Pick<
  AutomationsPageData,
  "automations" | "usage" | "salesAgent" | "followUpAgent"
>;

export function AutomationsHub({
  automations,
  usage,
  salesAgent,
  followUpAgent,
}: AutomationsHubProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>(AUTOMATION_TRIGGERS[0].id);
  const [actionType, setActionType] = useState<string>(AUTOMATION_ACTIONS[0].id);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await createAutomationAction({
        name,
        triggerType: triggerType as SaveAutomationInput["triggerType"],
        actionType: actionType as SaveAutomationInput["actionType"],
        enabled: true,
      });

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.saveFailed);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.saved);
      setName("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function applyTemplate(templateId: string) {
    const template = AUTOMATION_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setName(template.name);
    setTriggerType(template.triggerType);
    setActionType(template.actionType);
  }

  return (
    <div className="min-h-0 flex-1 space-y-10 overflow-y-auto p-4 md:p-6">
      <AiAutomationPanel
        usage={usage}
        salesAgent={salesAgent}
        followUpAgent={followUpAgent}
      />

      <section className="space-y-6 border-t pt-8">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {AUTOMATIONS_MESSAGES.workflowsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {AUTOMATIONS_MESSAGES.workflowsIntro}
          </p>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{AUTOMATIONS_MESSAGES.templatesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {AUTOMATION_TEMPLATES.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template.id)}
              >
                {template.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{AUTOMATIONS_MESSAGES.create}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="automation-name">{AUTOMATIONS_MESSAGES.nameLabel}</Label>
              <Input
                id="automation-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Welcome new leads"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-trigger">
                {AUTOMATIONS_MESSAGES.triggerLabel}
              </Label>
              <select
                id="automation-trigger"
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={triggerType}
                onChange={(event) => setTriggerType(event.target.value)}
              >
                {AUTOMATION_TRIGGERS.map((trigger) => (
                  <option key={trigger.id} value={trigger.id}>
                    {trigger.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-action">{AUTOMATIONS_MESSAGES.actionLabel}</Label>
              <select
                id="automation-action"
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={actionType}
                onChange={(event) => setActionType(event.target.value)}
              >
                {AUTOMATION_ACTIONS.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={isSaving || !name.trim()}
                onClick={handleCreate}
              >
                {isSaving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <>
                    <PlusIcon className="size-4" />
                    {AUTOMATIONS_MESSAGES.create}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Your automations</CardTitle>
            <CardDescription>
              {automations.length === 0
                ? AUTOMATIONS_MESSAGES.empty
                : `${automations.length} workflow(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? null : (
              <ul className="divide-y rounded-lg border">
                {automations.map((item) => (
                  <AutomationListItem key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AutomationListItem({ item }: { item: AutomationItem }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-muted-foreground">
          {item.triggerType} → {item.actionType}
        </p>
      </div>
      <Badge variant={item.enabled ? "default" : "secondary"}>
        {item.enabled ? AUTOMATIONS_MESSAGES.enabled : AUTOMATIONS_MESSAGES.disabled}
      </Badge>
    </li>
  );
}
