"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ScrollTextIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchAuditBusinessOptionsAction,
  fetchAuditLogAction,
} from "@/features/audit/actions";
import {
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
  auditActionTone,
  formatAuditMetadata,
  type AuditLogEntry,
} from "@/features/audit/types";
import { formatAdminDateTime } from "@/lib/format-datetime";
import { buildCsvContent, downloadCsv } from "@/lib/csv-download";

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchAuditLogAction({
        query,
        action: actionFilter || undefined,
        businessId: businessFilter || undefined,
        limit: 150,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setEntries(result.entries);
      setTotal(result.total);
    });
  }, [actionFilter, businessFilter, query]);

  useEffect(() => {
    startTransition(async () => {
      const result = await fetchAuditBusinessOptionsAction();
      if (result.success) {
        setBusinesses(result.businesses);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Аудит"
        description="Журнал действий операторов платформы по tenant-аккаунтам"
        actions={
          <button
            type="button"
            disabled={entries.length === 0 || isPending}
            onClick={() => {
              const csv = buildCsvContent(
                ["created_at", "action", "actor_email", "business", "metadata"],
                entries.map((entry) => [
                  entry.createdAt,
                  entry.action,
                  entry.actorEmail,
                  entry.businessName ?? "",
                  JSON.stringify(entry.metadata),
                ]),
              );
              downloadCsv(`orzux-audit-${Date.now()}.csv`, csv);
            }}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Export CSV
          </button>
        }
      />

      <SectionCard
        title="Журнал событий"
        description={`Показано ${entries.length} из ${total}`}
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <label className="relative lg:col-span-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по email, бизнесу, metadata"
              className="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm"
            />
          </label>
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {AUDIT_ACTION_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={businessFilter}
            onChange={(event) => setBusinessFilter(event.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Все бизнесы</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="Записей пока нет"
            description="Действия suspend, toggle, delete и support появятся здесь."
            icon={ScrollTextIcon}
          />
        ) : (
          <div className="max-h-[720px] space-y-3 overflow-y-auto">
            {entries.map((entry) => {
              const metadataText = formatAuditMetadata(entry.metadata);

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-muted/20 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={auditActionLabel(entry.action)}
                      tone={auditActionTone(entry.action)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatAdminDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">{entry.actorEmail || "system"}</span>
                    {entry.businessName ? (
                      <>
                        {" · "}
                        <Link
                          href={`/businesses/${entry.businessId}`}
                          className="text-primary hover:underline"
                        >
                          {entry.businessName}
                        </Link>
                      </>
                    ) : (
                      <span className="text-muted-foreground"> · без business_id</span>
                    )}
                  </p>
                  {metadataText ? (
                    <p className="mt-1 text-xs text-muted-foreground">{metadataText}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Обновление...</p>
        ) : null}
      </SectionCard>
    </div>
  );
}
