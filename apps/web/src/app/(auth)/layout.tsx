import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="mb-8">
        <Link href="/">
          <Image
            src="/images/logos/wccg-logo.png"
            alt="WCCG 104.5 FM"
            width={1000}
            height={1000}
            className="h-20 w-auto brightness-0 invert"
            priority
          />
        </Link>
      </div>
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
