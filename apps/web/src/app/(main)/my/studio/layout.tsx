import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the Broadcast Studio subtree (projects, publish). Surfaced to the
 * creator/production side of the house — content_creator, host, production,
 * management (and admins, who pass via hasRealRole). Cosmetic "view as"
 * never widens this; RequireRole checks REAL roles and the underlying
 * studio/project tables are RLS-backed.
 */
export default function StudioAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole
      roles={["content_creator", "host", "production", "management"]}
      area="the broadcast studio"
    >
      {children}
    </RequireRole>
  );
}
