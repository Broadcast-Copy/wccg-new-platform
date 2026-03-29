"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Search,
  Users,
  BadgeCheck,
  Palette,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_type: string | null;
  vendor_verified: boolean;
  has_creator_access: boolean;
  has_vendor_access: boolean;
  created_at: string;
}

const USER_TYPES = ["listener", "vendor", "creator", "host", "admin", "super_admin"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserManagementPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch all profiles
  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch profiles:", error);
      toast.error("Failed to load users");
      setProfiles([]);
    } else {
      setProfiles(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        (p.display_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  // Stats
  const stats = useMemo(() => {
    const total = profiles.length;
    const verified = profiles.filter((p) => p.vendor_verified).length;
    const creators = profiles.filter((p) => p.user_type === "creator").length;
    return { total, verified, creators };
  }, [profiles]);

  // Toggle vendor_verified
  const toggleVerified = async (profile: Profile) => {
    setUpdating(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ vendor_verified: !profile.vendor_verified })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update verification status");
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id
            ? { ...p, vendor_verified: !p.vendor_verified }
            : p
        )
      );
      toast.success(
        `${profile.display_name || "User"} ${!profile.vendor_verified ? "verified" : "unverified"}`
      );
    }
    setUpdating(null);
  };

  // Toggle has_creator_access
  const toggleCreatorAccess = async (profile: Profile) => {
    setUpdating(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ has_creator_access: !profile.has_creator_access })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update creator access");
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id
            ? { ...p, has_creator_access: !p.has_creator_access }
            : p
        )
      );
      toast.success(
        `Creator access ${!profile.has_creator_access ? "granted" : "revoked"} for ${profile.display_name || "User"}`
      );
    }
    setUpdating(null);
  };

  // Toggle has_vendor_access
  const toggleVendorAccess = async (profile: Profile) => {
    setUpdating(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ has_vendor_access: !profile.has_vendor_access })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update vendor access");
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id
            ? { ...p, has_vendor_access: !p.has_vendor_access }
            : p
        )
      );
      toast.success(
        `Vendor access ${!profile.has_vendor_access ? "granted" : "revoked"} for ${profile.display_name || "User"}`
      );
    }
    setUpdating(null);
  };

  // Update user_type
  const updateUserType = async (profile: Profile, newType: string) => {
    setUpdating(profile.id);
    const { error } = await supabase
      .from("profiles")
      .update({ user_type: newType })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update user type");
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, user_type: newType } : p
        )
      );
      toast.success(`User type updated to ${newType}`);
    }
    setUpdating(null);
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

  // Helper: initials
  const initials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (email ?? "?")[0].toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <Users className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage all platform users
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchProfiles}
          disabled={loading}
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Users
          </p>
          <p className="mt-1 text-2xl font-bold text-[#dc2626]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Verified Vendors
          </p>
          <p className="mt-1 text-2xl font-bold text-[#22c55e]">
            {stats.verified}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Creators
          </p>
          <p className="mt-1 text-2xl font-bold text-[#7401df]">
            {stats.creators}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No users match your search." : "No users found."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-4 hover:bg-muted/20 transition-colors"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dc2626]/10 text-[#dc2626] font-bold text-sm">
                {initials(profile.display_name, profile.email)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile.display_name || "Unnamed User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile.email || profile.id}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize border-[#dc2626]/30 text-[#dc2626]"
                >
                  {profile.user_type || "listener"}
                </Badge>
                {profile.vendor_verified && (
                  <Badge className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/20">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Vendor verified toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Verified
                  </span>
                  <Switch
                    checked={profile.vendor_verified}
                    onCheckedChange={() => toggleVerified(profile)}
                    disabled={updating === profile.id}
                    className="data-[state=checked]:bg-[#22c55e]"
                  />
                </div>

                {/* Creator access toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Creator
                  </span>
                  <Switch
                    checked={profile.has_creator_access}
                    onCheckedChange={() => toggleCreatorAccess(profile)}
                    disabled={updating === profile.id}
                    className="data-[state=checked]:bg-[#7401df]"
                  />
                </div>

                {/* Vendor access toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Vendor
                  </span>
                  <Switch
                    checked={profile.has_vendor_access}
                    onCheckedChange={() => toggleVendorAccess(profile)}
                    disabled={updating === profile.id}
                    className="data-[state=checked]:bg-[#f59e0b]"
                  />
                </div>

                {/* User type selector */}
                <Select
                  value={profile.user_type || "listener"}
                  onValueChange={(val) => updateUserType(profile, val)}
                  disabled={updating === profile.id}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs capitalize">
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Showing {filtered.length} of {profiles.length} users
        </p>
      </div>
    </div>
  );
}
