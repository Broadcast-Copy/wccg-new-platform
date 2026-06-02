import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the sales suite — CRM, production orders, advertising, campaigns,
 * proposals, revenue tools. Sales / promotions / management (and admins)
 * pass; everyone else is blocked. RLS backs every table underneath.
 */
export default function SalesAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["sales", "promotions", "management"]} area="the sales workspace">
      {children}
    </RequireRole>
  );
}
