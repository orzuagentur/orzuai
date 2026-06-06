import { cn } from "@/lib/utils";

type DashboardFillProps = {
  children: React.ReactNode;
  className?: string;
  direction?: "col" | "row";
};

/** Fills the dashboard content area below the header without page-level scroll. */
export function DashboardFill({
  children,
  className,
  direction = "col",
}: DashboardFillProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1",
        direction === "col" ? "flex-col" : "flex-row",
        className,
      )}
    >
      {children}
    </div>
  );
}

type DashboardPaneHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export function DashboardPaneHeader({ children, className }: DashboardPaneHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6",
        className,
      )}
    >
      {children}
    </header>
  );
}

type DashboardPaneBodyProps = {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

/** Independently scrollable pane — only this region scrolls, not the whole page. */
export function DashboardPaneBody({
  children,
  className,
  padded = true,
}: DashboardPaneBodyProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
        className,
      )}
    >
      {padded ? (
        <div className="px-4 py-5 md:px-6">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

type DashboardScrollPageProps = {
  header: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

/** List-style pages: fixed title bar + scrollable content. */
export function DashboardScrollPage({
  header,
  toolbar,
  children,
}: DashboardScrollPageProps) {
  return (
    <DashboardFill>
      <DashboardPaneHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {header}
          {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
        </div>
      </DashboardPaneHeader>
      <DashboardPaneBody>{children}</DashboardPaneBody>
    </DashboardFill>
  );
}

type DashboardSplitViewProps = {
  navigation: React.ReactNode;
  navigationTitle?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  navClassName?: string;
};

/** Sidebar + main workspace. Each column scrolls independently. */
export function DashboardSplitView({
  navigation,
  navigationTitle,
  header,
  children,
  navClassName,
}: DashboardSplitViewProps) {
  return (
    <DashboardFill direction="row" className="flex-col lg:flex-row">
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-b bg-muted/15 lg:w-64 lg:border-b-0 lg:border-r xl:w-72",
          navClassName,
        )}
      >
        {navigationTitle ? (
          <div className="shrink-0 border-b px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {navigationTitle}
            </p>
          </div>
        ) : null}
        <div className="min-h-0 max-h-[38vh] flex-1 overflow-y-auto overscroll-y-contain lg:max-h-none">
          {navigation}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header ? <DashboardPaneHeader>{header}</DashboardPaneHeader> : null}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </DashboardFill>
  );
}
