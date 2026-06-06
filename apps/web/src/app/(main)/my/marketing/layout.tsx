import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the marketing tools subtree (campaigns, campaign-builder) to
 * promotions/sales/management. Cosmetic preview never widens this — RequireRole
 * checks REAL roles, and any data these pages touch is RLS-backed.
 */
export default function MarketingAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["promotions", "sales", "management"]} area="marketing tools">
      {children}
    </RequireRole>
  );
}
