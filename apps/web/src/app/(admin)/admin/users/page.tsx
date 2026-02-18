export const metadata = {
  title: "User Management | WCCG Admin",
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
      </div>
      {/* TODO: Fetch users and render management table with search/filter */}
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          User management table will appear here.
        </p>
      </div>
    </div>
  );
}
