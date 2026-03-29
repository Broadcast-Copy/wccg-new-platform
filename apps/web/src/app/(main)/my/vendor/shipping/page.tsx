"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  DollarSign,
  MapPin,
  Globe,
  Clock,
  Save,
  Package,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-[#f59e0b]" : "bg-foreground/20"
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function VendorShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [flatRate, setFlatRate] = useState("");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [localPickup, setLocalPickup] = useState(false);
  const [shipsNationwide, setShipsNationwide] = useState(false);
  const [processingDays, setProcessingDays] = useState("3");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("vendor_shipping")
          .select("*")
          .eq("vendor_id", user.id)
          .single();

        if (data) {
          setFlatRate(data.flat_rate?.toString() ?? "");
          setFreeShippingThreshold(
            data.free_shipping_threshold?.toString() ?? "",
          );
          setLocalPickup(data.local_pickup ?? false);
          setShipsNationwide(data.ships_nationwide ?? false);
          setProcessingDays(data.processing_days?.toString() ?? "3");
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("vendor_shipping").upsert({
        vendor_id: user.id,
        flat_rate: flatRate ? parseFloat(flatRate) : null,
        free_shipping_threshold: freeShippingThreshold
          ? parseFloat(freeShippingThreshold)
          : null,
        local_pickup: localPickup,
        ships_nationwide: shipsNationwide,
        processing_days: processingDays ? parseInt(processingDays, 10) : 3,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // Best-effort
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#f59e0b]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/10">
          <Truck className="h-5 w-5 text-[#f59e0b]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Shipping Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure how your products are shipped
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="space-y-6">
          {/* Flat Rate */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground/70">
              <DollarSign className="h-4 w-4 text-[#f59e0b]" />
              Flat Rate Shipping
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-foreground/[0.04] py-2 pl-7 pr-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#f59e0b]/50 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Charged per order regardless of items
            </p>
          </div>

          {/* Free Shipping Threshold */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground/70">
              <Package className="h-4 w-4 text-[#f59e0b]" />
              Free Shipping Threshold
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-foreground/[0.04] py-2 pl-7 pr-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#f59e0b]/50 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Orders above this amount ship free. Leave blank to disable.
            </p>
          </div>

          {/* Processing Days */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground/70">
              <Clock className="h-4 w-4 text-[#f59e0b]" />
              Processing Time (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={processingDays}
              onChange={(e) => setProcessingDays(e.target.value)}
              className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#f59e0b]/50 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Business days to prepare an order before shipping
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#f59e0b]" />
                <div>
                  <p className="text-sm font-medium">Local Pickup</p>
                  <p className="text-xs text-muted-foreground">
                    Allow customers to pick up in person
                  </p>
                </div>
              </div>
              <Toggle checked={localPickup} onChange={setLocalPickup} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-[#f59e0b]" />
                <div>
                  <p className="text-sm font-medium">Ships Nationwide</p>
                  <p className="text-xs text-muted-foreground">
                    Ship to all 50 states
                  </p>
                </div>
              </div>
              <Toggle
                checked={shipsNationwide}
                onChange={setShipsNationwide}
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 border-t border-border/50 pt-6">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f59e0b] px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#d97706] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {saved && (
              <span className="text-sm text-[#f59e0b] animate-in fade-in">
                Saved successfully!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
