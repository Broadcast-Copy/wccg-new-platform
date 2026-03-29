"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Store,
  ShoppingBag,
  CalendarCheck,
  Ticket,
  Coins,
  ArrowRight,
  CheckCircle2,
  Package,
  CalendarDays,
  ExternalLink,
  ImagePlus,
  FileUp,
  X,
  Loader2,
  Save,
  Eye,
  ChevronDown,
} from "lucide-react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { useFileUpload } from "@/hooks/use-file-upload";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BusinessType =
  | "restaurant"
  | "retail"
  | "services"
  | "entertainment"
  | "other";

interface GalleryItem {
  url: string;
  name: string;
}

interface MenuItem {
  url: string;
  name: string;
  type: string; // "image" | "pdf"
}

interface ProfileData {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

const QUICK_ACTIONS = [
  {
    href: "",
    label: "View Storefront",
    icon: Eye,
    bg: "bg-[#f59e0b]/10",
    color: "text-[#f59e0b]",
    isStorefront: true,
  },
  {
    href: "/my/vendor/products",
    label: "Manage Products",
    icon: ShoppingBag,
    bg: "bg-[#f59e0b]/10",
    color: "text-[#f59e0b]",
  },
  {
    href: "/my/vendor/bookings",
    label: "Manage Bookings",
    icon: CalendarCheck,
    bg: "bg-emerald-500/10",
    color: "text-emerald-400",
  },
  {
    href: "/my/vendor/events",
    label: "Manage Events",
    icon: Ticket,
    bg: "bg-blue-500/10",
    color: "text-blue-400",
  },
  {
    href: "/my/vendor/tokens",
    label: "Token Dashboard",
    icon: Coins,
    bg: "bg-purple-500/10",
    color: "text-purple-400",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGalleryKey(userId: string) {
  return `wccg_vendor_gallery_${userId}`;
}

function getMenuKey(userId: string) {
  return `wccg_vendor_menus_${userId}`;
}

function getBusinessTypeKey(userId: string) {
  return `wccg_vendor_business_type_${userId}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StorefrontPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  // -- Profile state --
  const [profile, setProfile] = useState<ProfileData>({
    display_name: null,
    email: null,
    avatar_url: null,
  });
  const [profileForm, setProfileForm] = useState<ProfileData>({
    display_name: null,
    email: null,
    avatar_url: null,
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // -- Business type --
  const [businessType, setBusinessType] = useState<BusinessType>("other");

  // -- Gallery state --
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const {
    upload: uploadGalleryFile,
    isUploading: galleryUploading,
    error: galleryError,
  } = useFileUpload("images");

  // -- Menu state --
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const menuInputRef = useRef<HTMLInputElement>(null);
  const {
    upload: uploadMenuFile,
    isUploading: menuUploading,
    error: menuError,
  } = useFileUpload("images");

  // -- Stats state --
  const [stats, setStats] = useState({
    products: 0,
    bookings: 0,
    events: 0,
    orders: 0,
  });

  // ---------- Fetch profile ----------
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!cancelled && data) {
        const p: ProfileData = {
          display_name: data.display_name ?? null,
          email: data.email ?? user.email ?? null,
          avatar_url: data.avatar_url ?? null,
        };
        setProfile(p);
        setProfileForm(p);
      }
      if (!cancelled) setProfileLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  // ---------- Fetch stats ----------
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const [products, bookings, events, orders] = await Promise.all([
        supabase
          .from("vendor_products")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", user.id)
          .eq("status", "active"),
        supabase
          .from("vendor_bookings")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", user.id)
          .eq("status", "active"),
        supabase
          .from("vendor_events")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", user.id)
          .eq("status", "upcoming"),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", user.id),
      ]);

      if (!cancelled) {
        setStats({
          products: products.count ?? 0,
          bookings: bookings.count ?? 0,
          events: events.count ?? 0,
          orders: orders.count ?? 0,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  // ---------- Load localStorage data ----------
  useEffect(() => {
    if (!user?.id) return;
    setGallery(loadFromStorage<GalleryItem[]>(getGalleryKey(user.id), []));
    setMenus(loadFromStorage<MenuItem[]>(getMenuKey(user.id), []));
    setBusinessType(
      loadFromStorage<BusinessType>(getBusinessTypeKey(user.id), "other"),
    );
  }, [user]);

  // ---------- Profile save ----------
  const saveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      await supabase
        .from("profiles")
        .update({
          display_name: profileForm.display_name,
          email: profileForm.email,
          avatar_url: profileForm.avatar_url,
        })
        .eq("id", user.id);

      setProfile(profileForm);
      setEditingProfile(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSavingProfile(false);
    }
  }, [supabase, user, profileForm]);

  // ---------- Gallery handlers ----------
  const handleGalleryUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.id) return;

      const url = await uploadGalleryFile(file);
      if (url) {
        const next = [...gallery, { url, name: file.name }];
        setGallery(next);
        saveToStorage(getGalleryKey(user.id), next);
      }

      // Reset input so the same file can be selected again
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    },
    [uploadGalleryFile, gallery, user],
  );

  const removeGalleryItem = useCallback(
    (index: number) => {
      if (!user?.id) return;
      const next = gallery.filter((_, i) => i !== index);
      setGallery(next);
      saveToStorage(getGalleryKey(user.id), next);
    },
    [gallery, user],
  );

  // ---------- Menu handlers ----------
  const handleMenuUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.id) return;

      const url = await uploadMenuFile(file);
      if (url) {
        const isPdf = file.type === "application/pdf";
        const next = [
          ...menus,
          { url, name: file.name, type: isPdf ? "pdf" : "image" },
        ];
        setMenus(next);
        saveToStorage(getMenuKey(user.id), next);
      }

      if (menuInputRef.current) menuInputRef.current.value = "";
    },
    [uploadMenuFile, menus, user],
  );

  const removeMenuItem = useCallback(
    (index: number) => {
      if (!user?.id) return;
      const next = menus.filter((_, i) => i !== index);
      setMenus(next);
      saveToStorage(getMenuKey(user.id), next);
    },
    [menus, user],
  );

  // ---------- Business type handler ----------
  const handleBusinessTypeChange = useCallback(
    (value: BusinessType) => {
      if (!user?.id) return;
      setBusinessType(value);
      saveToStorage(getBusinessTypeKey(user.id), value);
    },
    [user],
  );

  // ---------- Auth guard ----------
  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Store className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Sign in to manage your storefront</p>
        <Link
          href="/auth/login"
          className="rounded-xl bg-[#f59e0b] px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const displayName = profile.display_name || "My Store";

  const STAT_CARDS = [
    {
      label: "Active Products",
      value: stats.products,
      icon: Package,
      color: "text-[#f59e0b]",
      bg: "bg-[#f59e0b]/10",
    },
    {
      label: "Active Bookings",
      value: stats.bookings,
      icon: CalendarCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Upcoming Events",
      value: stats.events,
      icon: CalendarDays,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Orders",
      value: stats.orders,
      icon: Coins,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* -- Hero + View Storefront ---------------------------------------- */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b]/10">
              <Store className="h-7 w-7 text-[#f59e0b]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#f59e0b]">
                  Vendor
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/vendors?id=${user.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
          >
            <ExternalLink className="h-4 w-4" />
            View My Storefront
          </Link>
        </div>
      </div>

      {/* -- Quick Stats --------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Quick Stats</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className={`inline-flex rounded-xl p-2 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -- Business Type ------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Business Type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your business category to help customers find you.
        </p>
        <div className="relative mt-4 w-full max-w-xs">
          <select
            value={businessType}
            onChange={(e) =>
              handleBusinessTypeChange(e.target.value as BusinessType)
            }
            className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-2.5 pr-10 text-sm font-medium outline-none transition-colors focus:border-[#f59e0b]"
          >
            {BUSINESS_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </section>

      {/* -- Store Settings ------------------------------------------------ */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Store Settings</h2>
          {!editingProfile && (
            <button
              onClick={() => {
                setProfileForm(profile);
                setEditingProfile(true);
              }}
              className="rounded-xl bg-[#f59e0b]/10 px-4 py-2 text-sm font-medium text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/20"
            >
              Edit
            </button>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          {!profileLoaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Business Name
                </label>
                <input
                  type="text"
                  value={profileForm.display_name ?? ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      display_name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  placeholder="Your business name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email ?? ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  placeholder="contact@business.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={profileForm.avatar_url ?? ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      avatar_url: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/[0.06]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Business Name</p>
                <p className="mt-0.5 text-sm font-medium">
                  {profile.display_name || "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-0.5 text-sm font-medium">
                  {profile.email || "--"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Avatar URL</p>
                <p className="mt-0.5 truncate text-sm font-medium">
                  {profile.avatar_url || "--"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* -- Store Gallery ------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Store Gallery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add photos of your storefront, products, or menu.
        </p>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          {/* Upload button */}
          <div className="mb-4">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryUpload}
            />
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b]/10 px-4 py-2 text-sm font-medium text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/20 disabled:opacity-50"
            >
              {galleryUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {galleryUploading ? "Uploading..." : "Upload Photo"}
            </button>
            {galleryError && (
              <p className="mt-2 text-xs text-red-400">{galleryError}</p>
            )}
          </div>

          {/* Gallery grid */}
          {gallery.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No gallery photos yet. Upload your first photo above.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((item, idx) => (
                <div
                  key={`${item.url}-${idx}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeGalleryItem(idx)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -- Menu / Price List --------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Menu / Price List</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your menu, price list, or service catalog (images or PDFs).
        </p>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          {/* Upload button */}
          <div className="mb-4">
            <input
              ref={menuInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleMenuUpload}
            />
            <button
              onClick={() => menuInputRef.current?.click()}
              disabled={menuUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b]/10 px-4 py-2 text-sm font-medium text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/20 disabled:opacity-50"
            >
              {menuUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {menuUploading ? "Uploading..." : "Upload File"}
            </button>
            {menuError && (
              <p className="mt-2 text-xs text-red-400">{menuError}</p>
            )}
          </div>

          {/* Menu items */}
          {menus.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No menu files yet. Upload your first file above.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {menus.map((item, idx) => (
                <div
                  key={`${item.url}-${idx}`}
                  className="group relative overflow-hidden rounded-xl border border-border"
                >
                  {item.type === "pdf" ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex aspect-square flex-col items-center justify-center gap-2 bg-foreground/[0.03] p-4 transition-colors hover:bg-foreground/[0.06]"
                    >
                      <FileUp className="h-8 w-8 text-[#f59e0b]" />
                      <span className="line-clamp-2 text-center text-xs font-medium">
                        {item.name}
                      </span>
                    </a>
                  ) : (
                    <div className="aspect-square">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="border-t border-border px-3 py-2">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                  </div>
                  <button
                    onClick={() => removeMenuItem(idx)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -- Quick Actions ------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const href =
              "isStorefront" in action && action.isStorefront
                ? `/vendors?id=${user.id}`
                : action.href;

            return (
              <Link
                key={action.label}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[#f59e0b]/40"
              >
                <div className={`rounded-xl p-2 ${action.bg}`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
