import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { PointsBadge } from "@/components/points/points-badge";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              WCCG 104.5 FM
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link
                href="/channels"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Channels
              </Link>
              <Link
                href="/schedule"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Schedule
              </Link>
              <Link
                href="/shows"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Shows
              </Link>
              <Link
                href="/events"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Events
              </Link>
              <Link
                href="/rewards"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Rewards
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <PointsBadge />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="container py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 pb-20">
        <div className="container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WCCG 104.5 FM. All rights
            reserved.
          </p>
          <nav className="flex gap-4">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
