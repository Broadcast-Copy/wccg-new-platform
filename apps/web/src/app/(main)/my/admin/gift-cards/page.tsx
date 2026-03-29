"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Loader2,
  Plus,
  Gift,
  Filter,
  Hash,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  balance: number;
  status: string;
  created_at: string;
}

type FilterStatus = "all" | "active" | "redeemed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "redeemed":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BulkGiftCardsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");

  // Form state
  const [quantity, setQuantity] = useState(10);
  const [amount, setAmount] = useState(25);

  // ---- Fetch gift cards ----
  const fetchCards = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gift_cards")
      .select("id, code, amount, balance, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load gift cards:", error.message);
    } else {
      setCards((data as GiftCard[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (user) fetchCards();
  }, [user, fetchCards]);

  // ---- Generate bulk gift cards ----
  const handleGenerate = async () => {
    if (!user) return;

    if (quantity < 1 || quantity > 100) {
      toast.error("Quantity must be between 1 and 100.");
      return;
    }
    if (amount < 10 || amount > 500) {
      toast.error("Amount must be between $10 and $500.");
      return;
    }

    setGenerating(true);

    const newCards = Array.from({ length: quantity }, () => ({
      code: generateCode(),
      amount,
      balance: amount,
      status: "active",
      purchaser_id: user.id,
    }));

    const { error } = await supabase.from("gift_cards").insert(newCards);

    if (error) {
      toast.error("Failed to generate gift cards. " + error.message);
    } else {
      toast.success(`Generated ${quantity} gift card(s)!`);
      fetchCards();
    }

    setGenerating(false);
  };

  // ---- Filtered cards ----
  const filteredCards =
    filter === "all" ? cards : cards.filter((c) => c.status === filter);

  // ---- Render ----
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Sign in as an admin to manage gift cards.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gift size={24} className="text-red-500" />
          Bulk Gift Cards
        </h1>
        <p className="text-zinc-400 mt-1">
          Generate and manage gift card codes
        </p>
      </div>

      {/* Generate form */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            Generate New Cards
          </h2>

          <div className="flex flex-wrap gap-4 items-end">
            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Quantity (1-100)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Amount ($10-$500)
              </label>
              <input
                type="number"
                min={10}
                max={500}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Generate {quantity} Card{quantity !== 1 && "s"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "redeemed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-red-600/20 text-red-400 border border-red-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
            }`}
          >
            <Filter size={12} className="inline mr-1" />
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="text-xs text-zinc-500 self-center ml-2">
          {filteredCards.length} card{filteredCards.length !== 1 && "s"}
        </span>
      </div>

      {/* Gift cards list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : filteredCards.length === 0 ? (
        <p className="text-center text-zinc-500 py-10">
          No gift cards found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              className="border-zinc-800 bg-zinc-900/40"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-white tracking-wider">
                    <Hash size={12} className="inline text-red-500 mr-1" />
                    {card.code}
                  </span>
                  <Badge className={statusColor(card.status)}>
                    {card.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <DollarSign size={12} />
                    Amount: ${card.amount.toFixed(2)}
                  </span>
                  <span className="text-zinc-400">
                    Balance: ${card.balance.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  <CalendarDays size={12} />
                  {formatDate(card.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
