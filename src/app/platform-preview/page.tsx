import { PlatformPreviewPanel } from "@/components/platform-preview/PlatformPreviewPanel";
import { verifyPlatformPreviewToken } from "@/lib/platform-preview/token";
import { loadPlatformPreviewData } from "@/services/platform-preview.service";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type PlatformPreviewPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function PlatformPreviewPage({
  searchParams,
}: PlatformPreviewPageProps) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center p-6">
        <p className="text-sm text-destructive">Missing preview token.</p>
      </main>
    );
  }

  const payload = verifyPlatformPreviewToken(token);

  if (!payload) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center p-6">
        <p className="text-sm text-destructive">
          Preview link expired or invalid.
        </p>
      </main>
    );
  }

  const data = await loadPlatformPreviewData({
    businessId: payload.businessId,
    adminEmail: payload.adminEmail,
  });

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center p-6">
        <p className="text-sm text-destructive">Business not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <PlatformPreviewPanel data={data} />
    </main>
  );
}
