import Link from "next/link";

export default function PublicBookNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Booking page not found</h1>
        <p className="mt-2 text-muted-foreground">
          This link may be unpublished or no longer available.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          Go to OrzuX
        </Link>
      </div>
    </main>
  );
}
