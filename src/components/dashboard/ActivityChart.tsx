import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActivityDataPoint } from "@/types/dashboard.types";

type ActivityChartProps = {
  data: ActivityDataPoint[];
  title?: string;
  description?: string;
  className?: string;
};

export function ActivityChart({
  data,
  title = "Activity Chart",
  description = "Message volume over the last 7 days.",
  className,
}: ActivityChartProps) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);

  return (
    <Card className={className ?? "shadow-none"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-2">
          {data.map((point) => {
            const height = `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 8 : 4)}%`;

            return (
              <div
                key={point.label}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all"
                    style={{ height }}
                    title={`${point.value} messages`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
