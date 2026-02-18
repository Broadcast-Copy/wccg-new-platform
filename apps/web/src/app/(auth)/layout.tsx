import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          WCCG 104.5 FM
        </Link>
      </div>
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
