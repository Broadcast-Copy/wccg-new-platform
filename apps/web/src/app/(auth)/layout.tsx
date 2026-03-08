import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-gradient-to-b from-background to-muted/30 px-4 py-8">
      <div className="my-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Image
              src="/images/logos/1045fm-logo.png"
              alt="WCCG 104.5 FM"
              width={500}
              height={324}
              className="w-[180px] h-auto"
              priority
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
