import { Skeleton } from "@/components/ui/skeleton";

type ConversationListSkeletonProps = {
  rows?: number;
};

export function ConversationListSkeleton({
  rows = 6,
}: ConversationListSkeletonProps) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}
