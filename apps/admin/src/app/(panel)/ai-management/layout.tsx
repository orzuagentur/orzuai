import { AiManagementNav } from "@/components/AiManagementNav";

export default function AiManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:max-w-none md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Управление AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Платформенные настройки ИИ: ключи API, модели по сценариям и карта
          архитектуры ответов.
        </p>
      </div>
      <AiManagementNav />
      {children}
    </div>
  );
}
