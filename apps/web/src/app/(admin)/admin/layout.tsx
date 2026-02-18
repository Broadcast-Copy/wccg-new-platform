import Link from "next/link";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/streams", label: "Streams" },
  { href: "/admin/shows", label: "Shows" },
  { href: "/admin/hosts", label: "Hosts" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/points", label: "Points" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-muted/30">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="text-lg font-bold">
            WCCG Admin
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t p-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to site
          </Link>
        </div>
      </aside>

      {/* Admin Main Content */}
      <div className="flex-1">
        <header className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Administration</h2>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
