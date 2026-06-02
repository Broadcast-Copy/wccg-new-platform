import { RequireRole } from "@/components/auth/require-role";

/**
 * Gates the vendor workspace — storefront, products, orders, payouts,
 * shipping. Users with the `vendor` role or `has_vendor_access` pass (the
 * roles hook maps has_vendor_access → "vendor"); admins pass too. Listeners
 * without vendor access are sent to the access-restricted screen.
 */
export default function VendorAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["vendor"]} area="the vendor workspace">
      {children}
    </RequireRole>
  );
}
