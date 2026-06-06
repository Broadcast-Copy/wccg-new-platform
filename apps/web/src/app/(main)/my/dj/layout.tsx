import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the DJ Portal subtree (slot schedule, file-code drops, FTP creds).
 * DJs are modeled as `host`; on-air content creators may also hold a slot.
 * Admins pass via hasRealRole. Cosmetic "view as" never widens this — the
 * guard checks REAL roles, and the drops/FTP tables are RLS-backed.
 */
export default function DjAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["host", "content_creator"]} area="the DJ portal">
      {children}
    </RequireRole>
  );
}
