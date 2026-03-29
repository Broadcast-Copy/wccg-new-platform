"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  Loader2,
  RefreshCw,
  DollarSign,
  Pencil,
  Save,
  X,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlatformFee {
  id: string;
  category: string;
  fee_percent: number;
  description: string | null;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlatformFeesPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    fee_percent: number;
    description: string;
    is_active: boolean;
  }>({ fee_percent: 0, description: "", is_active: true });
  const [saving, setSaving] = useState(false);

  // Simulated monthly order volume for revenue impact estimate
  const ESTIMATED_MONTHLY_VOLUME = 25000;

  // Fetch fees
  const fetchFees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_fees")
      .select("*")
      .order("category");

    if (error) {
      console.error("Failed to fetch platform fees:", error);
      toast.error("Failed to load fee configuration");
      setFees([]);
    } else {
      setFees(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Start editing
  const startEdit = (fee: PlatformFee) => {
    setEditingId(fee.id);
    setEditValues({
      fee_percent: fee.fee_percent,
      description: fee.description || "",
      is_active: fee.is_active,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
  };

  // Save edits
  const saveEdit = async (feeId: string) => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("platform_fees")
      .update({
        fee_percent: editValues.fee_percent,
        description: editValues.description || null,
        is_active: editValues.is_active,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", feeId);

    if (error) {
      toast.error("Failed to update fee");
    } else {
      setFees((prev) =>
        prev.map((f) =>
          f.id === feeId
            ? {
                ...f,
                fee_percent: editValues.fee_percent,
                description: editValues.description || null,
                is_active: editValues.is_active,
                updated_by: user.id,
                updated_at: new Date().toISOString(),
              }
            : f
        )
      );
      toast.success("Fee updated successfully");
      setEditingId(null);
    }
    setSaving(false);
  };

  // Auth guard
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Shield className="h-12 w-12 text-[#dc2626]" />
        <h2 className="text-xl font-bold text-foreground">Sign In Required</h2>
        <p className="text-sm text-muted-foreground">
          You must be signed in as an admin to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <DollarSign className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Platform Fees
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure fee percentages for each category
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchFees}
          disabled={loading}
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Revenue impact summary */}
      <div className="rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-[#dc2626]" />
          <h3 className="text-sm font-semibold text-foreground">
            Revenue Impact Estimate
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Based on estimated monthly volume of ${ESTIMATED_MONTHLY_VOLUME.toLocaleString()}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fees
            .filter((f) => f.is_active)
            .map((fee) => {
              const impact = (ESTIMATED_MONTHLY_VOLUME * fee.fee_percent) / 100;
              return (
                <div
                  key={fee.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {fee.category}
                  </p>
                  <p className="text-lg font-bold text-[#dc2626]">
                    ${impact.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fee.fee_percent}% of volume
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Fee Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fees.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No fee categories configured. Add rows to the platform_fees table to
            get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {fees.map((fee) => {
            const isEditing = editingId === fee.id;
            return (
              <div
                key={fee.id}
                className={`rounded-xl border bg-card p-5 space-y-4 transition-colors ${
                  isEditing
                    ? "border-[#dc2626]/40 shadow-lg shadow-[#dc2626]/5"
                    : "border-border hover:border-input"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground capitalize">
                      {fee.category.replace(/_/g, " ")}
                    </h3>
                    {!isEditing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {fee.description || "No description"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        fee.is_active
                          ? "border-[#22c55e]/30 text-[#22c55e]"
                          : "border-[#dc2626]/30 text-[#dc2626]"
                      }`}
                    >
                      {fee.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {!isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(fee)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-[#dc2626]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Display mode */}
                {!isEditing && (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-[#dc2626]">
                      {fee.fee_percent}
                    </span>
                    <span className="text-lg font-medium text-[#dc2626]/60 mb-0.5">
                      %
                    </span>
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">
                        Fee Percent
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={editValues.fee_percent}
                        onChange={(e) =>
                          setEditValues((v) => ({
                            ...v,
                            fee_percent: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">
                        Description
                      </label>
                      <Textarea
                        value={editValues.description}
                        onChange={(e) =>
                          setEditValues((v) => ({
                            ...v,
                            description: e.target.value,
                          }))
                        }
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                        <Switch
                          checked={editValues.is_active}
                          onCheckedChange={(checked) =>
                            setEditValues((v) => ({ ...v, is_active: checked }))
                          }
                          className="data-[state=checked]:bg-[#22c55e]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(fee.id)}
                        disabled={saving}
                        className="h-8 text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="h-8 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Last updated */}
                {fee.updated_at && !isEditing && (
                  <p className="text-[10px] text-muted-foreground/50">
                    Updated{" "}
                    {new Date(fee.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          {fees.length} fee {fees.length === 1 ? "category" : "categories"}{" "}
          configured &middot; {fees.filter((f) => f.is_active).length} active
        </p>
      </div>
    </div>
  );
}
