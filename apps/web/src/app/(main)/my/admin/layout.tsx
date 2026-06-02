import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the entire admin / station-control subtree (incl. GM, traffic,
 * operations, EAS, master-control, analytics, projects, users, etc.).
 * Anonymous and listener accounts can no longer reach finance/FCC/admin
 * pages. Admins/super_admins/management pass; everything is also RLS-backed.
 */
export default function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["admin", "super_admin", "management"]} area="the admin console">
      {children}
    </RequireRole>
  );
}
