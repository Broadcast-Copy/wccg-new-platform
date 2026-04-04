"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { HubFeed } from "@/components/social/hub-feed";
import { HubSidebar } from "@/components/social/hub-sidebar";
import {
  Store,
  Users,
  ShoppingBag,
  CalendarDays,
  BookOpen,
  Megaphone,
  Coins,
  ArrowRight,
  Package,
  BarChart3,
  Receipt,
  DollarSign,
  MapPin,
  Settings,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Resources grid data
// ---------------------------------------------------------------------------
const resources = [
  {
    icon: Users,
    title: "Wholesale Directory",
    description: "Connect with other vendors for bulk deals",
    href: "/my/directory",
  },
  {
    icon: BookOpen,
    title: "Vendor Resources",
    description: "Guides, templates, and best practices",
    href: "/my/vendor",
  },
  {
    icon: Megaphone,
    title: "Marketing Tools",
    description: "Promote your products and events",
    href: "/my/vendor/media",
  },
  {
    icon: Coins,
    title: "Token System",
    description: "Earn and spend vendor tokens",
    href: "/my/vendor/tokens",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function VendorHubPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [memberLoading, setMemberLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [stats, setStats] = useState({ vendors: 0, products: 0, events: 0 });

  useEffect(() => {
    if (!user) { setMemberLoading(false); return; }
    supabase.from('hub_memberships').select('id').eq('user_id', user.id).eq('hub_type', 'vendor').single()
      .then(({ data }) => { setIsMember(!!data); setMemberLoading(false); });
  }, [user, supabase]);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    await supabase.from('hub_memberships').insert({ user_id: user.id, hub_type: 'vendor' });
    setIsMember(true);
    setJoining(false);
  }

  async function handleLeave() {
    if (!user || !confirm("Leave the Vendor Hub?")) return;
    await supabase.from('hub_memberships').delete().eq('user_id', user.id).eq('hub_type', 'vendor');
    setIsMember(false);
  }

  useEffect(() => {
    async function loadStats() {
      const [vendorsRes, productsRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("vendor_products")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("vendor_events")
          .select("id", { count: "exact", head: true })
          .eq("status", "upcoming"),
      ]);

      setStats({
        vendors: vendorsRes.count ?? 0,
        products: productsRes.count ?? 0,
        events: eventsRes.count ?? 0,
      });
    }

    loadStats();
  }, [supabase]);

  if (memberLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f59e0b] border-t-transparent" /></div>;
  }

  if (isMember) {
    return (
      <HubSidebar hubType="vendor" color="#f59e0b">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <Store className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Vendor Hub</h1>
                <span className="text-xs text-[#f59e0b] font-medium">Member</span>
              </div>
            </div>
            <button onClick={handleLeave} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
              Leave Hub
            </button>
          </div>
          <HubFeed
            hubType="vendor"
            accentColor="#f59e0b"
            placeholder="Share a product, wholesale offer, or vendor tip..."
            postTypes={[
              { value: "product", label: "Product Spotlight" },
              { value: "wholesale", label: "Wholesale Offer" },
              { value: "resource", label: "Resource" },
              { value: "milestone", label: "Milestone" },
            ]}
          />
        </div>
      </HubSidebar>
    );
  }

  return (
    <div className="space-y-8">
      {(
        <>
          {/* ---- Hero ---- */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
            <div className="relative px-6 py-10 sm:px-10 sm:py-14">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-xl">
                  <Store className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Vendor Hub</h1>
                  <p className="text-white/70 mt-1">
                    A network for vendors — wholesale, resources, and community
                    deals
                  </p>
                </div>
              </div>
              {user && (
                <button onClick={handleJoin} disabled={joining} className="mt-4 rounded-full bg-white text-gray-900 px-6 py-2 text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50">
                  {joining ? "Joining..." : "Join the Hub"}
                </button>
              )}
            </div>
          </div>

          {/* ---- Stats bar ---- */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Vendors", value: stats.vendors, icon: Users },
              { label: "Products Listed", value: stats.products, icon: ShoppingBag },
              { label: "Active Events", value: stats.events, icon: CalendarDays },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b]/10">
                  <s.icon className="h-5 w-5 text-[#f59e0b]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Resources grid ---- */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Vendor Resources
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {resources.map((r) => (
                <Link
                  key={r.title}
                  href={r.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b]/10 mb-3">
                    <r.icon className="h-5 w-5 text-[#f59e0b]" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {r.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {r.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-foreground/20 group-hover:text-[#f59e0b] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <HubFeed
        hubType="vendor"
        accentColor="#f59e0b"
        placeholder="Share a product, wholesale offer, or vendor tip..."
        postTypes={[
          { value: "product", label: "Product Spotlight" },
          { value: "wholesale", label: "Wholesale Offer" },
          { value: "resource", label: "Resource" },
          { value: "milestone", label: "Milestone" },
        ]}
      />
    </div>
  );
}
