"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  Wallet,
  DollarSign,
  CheckCircle,
  Loader2,
  Store,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Payout {
  id: string;
  vendor_id: string;
  amount: number;
  payout_method: string;
  status: string;
  notes: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        STATUS_STYLES[status] || "bg-gray-500/10 text-gray-600 border-gray-500/20"
      }`}
    >
      {status}
    </span>
  );
}

const MINIMUM_PAYOUT = 25;

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function VendorPayoutsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [availableBalance, setAvailableBalance] = useState(0);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- Fetch balance & payouts ---- */
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);

      // Get delivered orders total minus platform fees
      const { data: orders } = await supabase
        .from("orders")
        .select("total, platform_fee")
        .eq("vendor_id", user!.id)
        .eq("status", "delivered");

      const grossEarnings = (orders || []).reduce(
        (sum, o) => sum + (Number(o.total) - Number(o.platform_fee)),
        0
      );

      // Get already paid out amounts (completed + pending + processing)
      const { data: existingPayouts } = await supabase
        .from("vendor_payouts")
        .select("*")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });

      const paidOut = (existingPayouts || [])
        .filter((p) => ["completed", "pending", "processing"].includes(p.status))
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setAvailableBalance(Math.max(0, grossEarnings - paidOut));
      setPayouts((existingPayouts || []) as Payout[]);
      setLoading(false);
    }

    fetchData();
  }, [supabase, user]);

  /* ---- Request payout ---- */
  async function handleRequestPayout() {
    if (!user) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (parsedAmount < MINIMUM_PAYOUT) {
      setError(`Minimum payout is $${MINIMUM_PAYOUT.toFixed(2)}.`);
      return;
    }
    if (parsedAmount > availableBalance) {
      setError("Amount exceeds your available balance.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("vendor_payouts")
      .insert({
        vendor_id: user.id,
        amount: parsedAmount,
        payout_method: payoutMethod,
        status: "pending",
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Update local state
    setPayouts((prev) => [data as Payout, ...prev]);
    setAvailableBalance((prev) => prev - parsedAmount);
    setAmount("");
    setNotes("");
    setSuccess(true);
    setSubmitting(false);

    // Auto-dismiss success
    setTimeout(() => setSuccess(false), 4000);
  }

  /* ---- Auth guard ---- */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to view payouts</h2>
        <Link
          href="/login"
          className="mt-4 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Payouts</h1>
        <p className="text-muted-foreground">
          Request payouts for your marketplace earnings
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl border bg-card" />
          <div className="h-48 animate-pulse rounded-xl border bg-card" />
        </div>
      ) : (
        <>
          {/* ---- Available Balance ---- */}
          <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/10">
              <Wallet className="h-7 w-7 text-teal-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Available Balance
              </p>
              <p className="text-3xl font-bold text-teal-600">
                ${availableBalance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                From delivered orders, after platform fees
              </p>
            </div>
          </div>

          {/* ---- Payout Request Form ---- */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Request Payout</h2>

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-600">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Payout request submitted successfully!
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min={MINIMUM_PAYOUT}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min $${MINIMUM_PAYOUT.toFixed(2)}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special instructions..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleRequestPayout}
              disabled={submitting || availableBalance < MINIMUM_PAYOUT}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4" />
                  Request Payout
                </>
              )}
            </button>

            {availableBalance < MINIMUM_PAYOUT && (
              <p className="text-xs text-muted-foreground">
                Minimum payout is ${MINIMUM_PAYOUT.toFixed(2)}. You need $
                {(MINIMUM_PAYOUT - availableBalance).toFixed(2)} more in
                delivered orders.
              </p>
            )}
          </div>

          {/* ---- Payout History ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Payout History</h2>

            {payouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border bg-card">
                <DollarSign className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No payouts yet. Request your first payout above.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-semibold">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Method
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="border-b last:border-0">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(payout.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            ${Number(payout.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap capitalize">
                            {payout.payout_method.replace("_", " ")}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={payout.status} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                            {payout.notes || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
