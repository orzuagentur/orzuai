import { Skeleton } from "@/components/ui/skeleton";

type DashboardPageSkeletonProps = {
  cards?: number;
};

export function DashboardPageSkeleton({ cards = 4 }: DashboardPageSkeletonProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="min-h-[20rem] rounded-xl" />
    </div>
  );
}
