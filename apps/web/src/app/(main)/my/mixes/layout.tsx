import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the Media Manager / mixes subtree (mixshow library, uploads,
 * production folders). Same creator/production audience as the studio —
 * content_creator, host, production, management (admins pass via
 * hasRealRole). Cosmetic "view as" never widens this; RequireRole checks
 * REAL roles and every media table underneath is RLS-backed.
 */
export default function MixesAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole
      roles={["content_creator", "host", "production", "management"]}
      area="the media manager"
    >
      {children}
    </RequireRole>
  );
}
