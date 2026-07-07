import { ShieldAlertIcon } from "lucide-react";

export default function SuspendedAccountPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlertIcon className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Аккаунт приостановлен</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Доступ к панели OrzuX временно ограничен администратором платформы.
          Если вы считаете, что это ошибка, напишите в поддержку OrzuX.
        </p>
      </div>
    </div>
  );
}
