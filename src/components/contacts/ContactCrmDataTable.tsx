"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContactCrmDataTableProps = {
  title: string;
  count?: number;
  action?: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
  className?: string;
};

export function ContactCrmDataTable({
  title,
  count,
  action,
  emptyMessage,
  isEmpty = false,
  children,
  className,
}: ContactCrmDataTableProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          {title}
          {typeof count === "number" ? (
            <span className="ml-1.5 font-normal text-muted-foreground">
              ({count})
            </span>
          ) : null}
        </h3>
        {action}
      </div>

      {isEmpty && emptyMessage ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[32rem] text-sm">{children}</table>
        </div>
      )}
    </section>
  );
}

export function ContactCrmTableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <thead>
      <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function ContactCrmTableHeadCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2.5 font-medium first:pl-4 last:pr-4", className)}>
      {children}
    </th>
  );
}

export function ContactCrmTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y">{children}</tbody>;
}

export function ContactCrmTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn("align-middle hover:bg-muted/20", className)}>{children}</tr>;
}

export function ContactCrmTableCell({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-3 py-3 first:pl-4 last:pr-4", className)}
    >
      {children}
    </td>
  );
}
