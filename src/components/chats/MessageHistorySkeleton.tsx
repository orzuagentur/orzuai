import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MessageHistorySkeletonProps = {
  className?: string;
};

export function MessageHistorySkeleton({ className }: MessageHistorySkeletonProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-3 p-4", className)}>
      <Skeleton className="ml-auto h-10 w-48 rounded-2xl" />
      <Skeleton className="h-10 w-56 rounded-2xl" />
      <Skeleton className="ml-auto h-10 w-40 rounded-2xl" />
      <Skeleton className="h-10 w-52 rounded-2xl" />
      <Skeleton className="ml-auto h-10 w-44 rounded-2xl" />
    </div>
  );
}
