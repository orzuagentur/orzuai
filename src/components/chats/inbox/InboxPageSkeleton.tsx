import { ConversationListSkeleton } from "@/components/chats/ConversationListSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function InboxPageSkeleton() {
  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 shrink-0 overflow-hidden border-r">
          <div className="flex w-[4.75rem] flex-col gap-2 border-r bg-muted/15 px-1.5 py-2 xl:w-40">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-1 px-1 py-2">
                <Skeleton className="size-11 rounded-xl" />
                <Skeleton className="h-2 w-10 rounded" />
              </div>
            ))}
          </div>

          <div className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden lg:w-[22rem]">
            <ConversationListSkeleton rows={8} />
          </div>
        </div>

        <div className="hidden h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background lg:flex">
          <div className="shrink-0 border-b bg-background px-4 py-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <div className="flex flex-1 flex-col gap-3 bg-background p-4">
            <Skeleton className="ml-auto h-10 w-48 rounded-2xl" />
            <Skeleton className="h-10 w-56 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-40 rounded-2xl" />
          </div>
        </div>

        <div className="hidden min-h-0 w-80 shrink-0 border-l bg-background p-4 xl:block">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-24 w-full rounded-lg" />
          <Skeleton className="mt-3 h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
