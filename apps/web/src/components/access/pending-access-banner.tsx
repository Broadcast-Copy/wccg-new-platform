"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Clock, XCircle } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  creator: "Creator",
  vendor: "Vendor",
  employee: "Staff",
};

/**
 * Shows a status banner to a user whose elevated-access request (creator /
 * vendor / employee) is awaiting admin review or was declined. Listeners and
 * already-approved users see nothing. The gate itself is enforced by RLS +
 * the access flags; this is just the proactive heads-up.
 */
export function PendingAccessBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("access_request_status, requested_role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active || !data) return;
      setStatus(data.access_request_status ?? null);
      setRole(data.requested_role ?? null);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (status !== "pending" && status !== "denied") return null;

  const label = ROLE_LABEL[role ?? ""] ?? "elevated";

  if (status === "denied") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dc2626]/30 bg-[#dc2626]/5 px-5 py-4">
        <XCircle className="h-5 w-5 shrink-0 text-[#dc2626]" />
        <p className="text-sm text-foreground">
          Your <span className="font-semibold">{label}</span> access request
          wasn&apos;t approved. You can still use WCCG as a listener —{" "}
          <Link href="/contact" className="font-medium underline underline-offset-2">
            contact us
          </Link>{" "}
          if you think this was a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#7401df]/30 bg-gradient-to-r from-[#7401df]/10 to-transparent px-5 py-4">
      <Clock className="h-5 w-5 shrink-0 text-[#7401df]" />
      <p className="text-sm text-foreground">
        Your <span className="font-semibold">{label}</span> access is{" "}
        <span className="font-semibold text-[#7401df]">pending review</span>.
        We&apos;ll email you once an admin approves it. In the meantime you can
        explore WCCG as a listener.
      </p>
    </div>
  );
}
