import { ConversationListSkeleton } from "@/components/chats/ConversationListSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function InboxPageSkeleton() {
  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden border-r lg:w-[22rem] lg:shrink-0 xl:w-80">
          <ConversationListSkeleton rows={8} />
        </div>

        <div className="hidden h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex">
          <div className="shrink-0 border-b bg-card px-4 py-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <Skeleton className="ml-auto h-10 w-48 rounded-2xl" />
            <Skeleton className="h-10 w-56 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-40 rounded-2xl" />
          </div>
        </div>

        <div className="hidden min-h-0 w-80 shrink-0 border-l p-4 xl:block">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-24 w-full rounded-lg" />
          <Skeleton className="mt-3 h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
