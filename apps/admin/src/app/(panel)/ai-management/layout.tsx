import { AiManagementNav } from "@/components/AiManagementNav";

export default function AiManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Управление AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Платформенные настройки ИИ: ключи API, модели по сценариям, очередь
          fallback и архитектура ответов.
        </p>
      </div>
      <AiManagementNav />
      {children}
    </div>
  );
}
