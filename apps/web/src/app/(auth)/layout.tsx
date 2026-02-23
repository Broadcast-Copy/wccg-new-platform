import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";

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
            src="/images/logos/1045fm-logo.png"
            alt="WCCG 104.5 FM"
            width={500}
            height={324}
            className="w-[220px] h-auto brightness-0 invert"
            priority
          />
        </Link>
      </div>
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
