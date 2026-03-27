"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  Coins,
  Send,
  ShoppingCart,
  TrendingUp,
  Gift,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Trophy,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PurchaseTier {
  id: string;
  price: number;
  tokens: number;
  bonusPercent: number;
}

interface DistributionEntry {
  id: string;
  recipient: string;
  amount: number;
  reason: string;
  date: string;
}

type DistributionReason =
  | "Purchase Reward"
  | "Event Attendance"
  | "Promotion"
  | "Loyalty Bonus";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const PURCHASE_TIERS: PurchaseTier[] = [
  { id: "t1", price: 5, tokens: 1000, bonusPercent: 0 },
  { id: "t2", price: 10, tokens: 2200, bonusPercent: 10 },
  { id: "t3", price: 25, tokens: 6000, bonusPercent: 20 },
  { id: "t4", price: 50, tokens: 13000, bonusPercent: 30 },
];

const REASONS: DistributionReason[] = [
  "Purchase Reward",
  "Event Attendance",
  "Promotion",
  "Loyalty Bonus",
];

// const SEED_DISTRIBUTIONS: DistributionEntry[] = [
//   { id: "d1", recipient: "james.walker@email.com", amount: 500, reason: "Purchase Reward", date: "2026-03-25" },
//   { id: "d2", recipient: "tasha.brown@email.com", amount: 1000, reason: "Event Attendance", date: "2026-03-22" },
//   { id: "d3", recipient: "derek.miles@email.com", amount: 250, reason: "Promotion", date: "2026-03-20" },
//   { id: "d4", recipient: "keisha.johnson@email.com", amount: 750, reason: "Loyalty Bonus", date: "2026-03-18" },
//   { id: "d5", recipient: "marcus.davis@email.com", amount: 300, reason: "Purchase Reward", date: "2026-03-15" },
// ];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorTokensPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [distributions, setDistributions] = useState<DistributionEntry[]>([]);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [totalDistributed, setTotalDistributed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Deploy form state
  const [deployEmail, setDeployEmail] = useState("");
  const [deployAmount, setDeployAmount] = useState("");
  const [deployReason, setDeployReason] = useState<DistributionReason>("Purchase Reward");
  const [showDeployForm, setShowDeployForm] = useState(false);

  // Fetch token transactions from Supabase and calculate balance
  useEffect(() => {
    if (!user) return;
    async function fetchTransactions() {
      setLoading(true);
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('vendor_id', user!.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        let purchased = 0;
        let distributed = 0;
        const distEntries: DistributionEntry[] = [];

        for (const row of data) {
          if (row.type === 'purchase') {
            purchased += row.amount ?? 0;
          } else if (row.type === 'distribute') {
            distributed += row.amount ?? 0;
            distEntries.push({
              id: row.id,
              recipient: row.recipient_id ?? '',
              amount: row.amount ?? 0,
              reason: row.reason ?? 'Purchase Reward',
              date: row.created_at ? row.created_at.slice(0, 10) : '',
            });
          }
        }
        setTotalPurchased(purchased);
        setTotalDistributed(distributed);
        setDistributions(distEntries);
      }
      setLoading(false);
    }
    fetchTransactions();
  }, [user, supabase]);

  // Auth guard
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  const availableBalance = totalPurchased - totalDistributed;

  const handlePurchase = async (tier: PurchaseTier) => {
    const { data, error } = await supabase
      .from('token_transactions')
      .insert({
        vendor_id: user!.id,
        type: 'purchase',
        amount: tier.tokens,
        price_paid: tier.price,
      })
      .select();
    if (!error && data?.[0]) {
      setTotalPurchased((prev) => prev + tier.tokens);
    }
  };

  const handleDeploy = async () => {
    if (!deployEmail.trim() || !deployAmount.trim()) return;
    const amount = parseInt(deployAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    const { data, error } = await supabase
      .from('token_transactions')
      .insert({
        vendor_id: user!.id,
        type: 'distribute',
        amount,
        recipient_id: deployEmail,
        reason: deployReason,
      })
      .select();

    if (!error && data?.[0]) {
      const row = data[0];
      const entry: DistributionEntry = {
        id: row.id,
        recipient: deployEmail,
        amount,
        reason: deployReason,
        date: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
      setDistributions((prev) => [entry, ...prev]);
      setTotalDistributed((prev) => prev + amount);
    }
    setDeployEmail("");
    setDeployAmount("");
    setDeployReason("Purchase Reward");
    setShowDeployForm(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* ----------------------------------------------------------------- */}
      {/* Hero: Token Balance                                               */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 opacity-10">
          <Coins className="h-48 w-48" />
        </div>
        <p className="text-sm font-medium uppercase tracking-wider text-amber-100">
          Available Token Balance
        </p>
        <p className="mt-2 text-5xl font-extrabold tracking-tight">
          {availableBalance.toLocaleString()}
        </p>
        <p className="mt-1 text-amber-200">WCCG Tokens</p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Row                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Purchased", value: totalPurchased, icon: ShoppingCart, color: "text-green-500" },
          { label: "Total Distributed", value: totalDistributed, icon: Send, color: "text-blue-500" },
          { label: "Available Balance", value: availableBalance, icon: Coins, color: "text-amber-500" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className={`rounded-xl bg-muted p-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Purchase Tiers                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Purchase Tokens</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Buy token packs to distribute to your customers
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PURCHASE_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="relative flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-md"
            >
              {tier.bonusPercent > 0 && (
                <span className="absolute -top-2 right-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                  +{tier.bonusPercent}% Bonus
                </span>
              )}
              <Sparkles className="mb-3 h-8 w-8 text-amber-500" />
              <p className="text-3xl font-extrabold">${tier.price}</p>
              <p className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
                {tier.tokens.toLocaleString()} Tokens
              </p>
              <button
                onClick={() => handlePurchase(tier)}
                className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                Purchase
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Deploy Tokens                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Deploy Tokens</h2>
          <button
            onClick={() => setShowDeployForm(!showDeployForm)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <Send className="h-4 w-4" />
            Distribute
          </button>
        </div>

        {showDeployForm && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Recipient Email</label>
                <input
                  type="email"
                  value={deployEmail}
                  onChange={(e) => setDeployEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={deployAmount}
                  onChange={(e) => setDeployAmount(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Reason</label>
                <div className="relative">
                  <select
                    value={deployReason}
                    onChange={(e) => setDeployReason(e.target.value as DistributionReason)}
                    className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleDeploy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                >
                  <ArrowRight className="h-4 w-4" />
                  Send Tokens
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Distribution History                                              */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Distribution History</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{d.recipient}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Coins className="h-3.5 w-3.5" />
                      {d.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {d.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
