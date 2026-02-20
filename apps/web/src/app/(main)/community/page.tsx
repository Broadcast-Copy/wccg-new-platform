"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Navigation,
  Building2,
  UtensilsCrossed,
  Car,
  Scissors,
  HeartPulse,
  Scale,
  Home,
  GraduationCap,
  Church,
  Music,
  Wrench,
  Plus,
  Star,
  Radio,
  ChevronDown,
  ChevronUp,
  X,
  Locate,
  List,
  Map as MapIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Lazy-load the map component (Leaflet needs browser window)
// ---------------------------------------------------------------------------
const CommunityMap = dynamic(() => import("./community-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-xl border bg-slate-950/50">
      <div className="text-center space-y-2">
        <MapPin className="mx-auto h-8 w-8 text-teal-400 animate-pulse" />
        <p className="text-sm text-slate-400">Loading map…</p>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Business {
  id: string;
  name: string;
  category: Category;
  address: string;
  phone: string;
  description: string;
  website?: string;
  featured?: boolean;
  lat: number;
  lng: number;
}

type Category =
  | "Restaurants"
  | "Auto Services"
  | "Beauty & Barber"
  | "Health & Wellness"
  | "Legal Services"
  | "Real Estate"
  | "Education"
  | "Churches"
  | "Entertainment"
  | "Home Services";

// ---------------------------------------------------------------------------
// Streaming Channels (for branded banner)
// ---------------------------------------------------------------------------

interface StreamChannel {
  id: string;
  name: string;
  logo: string;
  href: string;
}

const CHANNELS: StreamChannel[] = [
  { id: "stream_wccg", name: "WCCG 104.5 FM", logo: "/images/logos/wccg-logo.png", href: "/channels/stream_wccg" },
  { id: "stream_soul", name: "SOUL 104.5 FM", logo: "/images/logos/soul-1045-logo.png", href: "/channels/stream_soul" },
  { id: "stream_hot", name: "HOT 104.5", logo: "/images/logos/hot-1045-logo.png", href: "/channels/stream_hot" },
  { id: "stream_vibe", name: "104.5 The VIBE", logo: "/images/logos/the-vibe-logo.png", href: "/channels/stream_vibe" },
  { id: "stream_yard", name: "Yard & Riddim", logo: "/images/logos/yard-riddim-logo.png", href: "/channels/stream_yard" },
  { id: "stream_mixsquad", name: "Mix Squad Radio", logo: "/images/logos/mix-squad-logo.png", href: "/channels/stream_mixsquad" },
];

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORIES: { label: Category; icon: React.ElementType }[] = [
  { label: "Restaurants", icon: UtensilsCrossed },
  { label: "Auto Services", icon: Car },
  { label: "Beauty & Barber", icon: Scissors },
  { label: "Health & Wellness", icon: HeartPulse },
  { label: "Legal Services", icon: Scale },
  { label: "Real Estate", icon: Home },
  { label: "Education", icon: GraduationCap },
  { label: "Churches", icon: Church },
  { label: "Entertainment", icon: Music },
  { label: "Home Services", icon: Wrench },
];

const CATEGORY_COLORS: Record<Category, { badge: string; marker: string }> = {
  Restaurants:        { badge: "bg-orange-500/20 text-orange-300 border-orange-500/30", marker: "#f97316" },
  "Auto Services":    { badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", marker: "#3b82f6" },
  "Beauty & Barber":  { badge: "bg-pink-500/20 text-pink-300 border-pink-500/30", marker: "#ec4899" },
  "Health & Wellness":{ badge: "bg-green-500/20 text-green-300 border-green-500/30", marker: "#22c55e" },
  "Legal Services":   { badge: "bg-slate-500/20 text-slate-300 border-slate-500/30", marker: "#64748b" },
  "Real Estate":      { badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", marker: "#f59e0b" },
  Education:          { badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", marker: "#6366f1" },
  Churches:           { badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", marker: "#a855f7" },
  Entertainment:      { badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", marker: "#f43f5e" },
  "Home Services":    { badge: "bg-teal-500/20 text-teal-300 border-teal-500/30", marker: "#14b8a6" },
};

// ---------------------------------------------------------------------------
// Mock data — 15 Fayetteville, NC businesses with real coordinates
// ---------------------------------------------------------------------------

const BUSINESSES: Business[] = [
  {
    id: "1",
    name: "Hilltop House Restaurant",
    category: "Restaurants",
    address: "1240 Fort Bragg Rd, Fayetteville, NC 28305",
    phone: "(910) 484-6699",
    description: "Southern comfort food made from scratch with locally sourced ingredients. A Fayetteville staple since 1998.",
    website: "https://example.com/hilltop",
    featured: true,
    lat: 35.0474, lng: -78.9120,
  },
  {
    id: "2",
    name: "Bragg Boulevard Auto Care",
    category: "Auto Services",
    address: "3450 Bragg Blvd, Fayetteville, NC 28303",
    phone: "(910) 555-0102",
    description: "Full-service auto repair and maintenance. ASE-certified technicians specializing in domestic and import vehicles.",
    website: "https://example.com/braggauto",
    lat: 35.0713, lng: -78.9436,
  },
  {
    id: "3",
    name: "Crown & Glory Barbershop",
    category: "Beauty & Barber",
    address: "512 Murchison Rd, Fayetteville, NC 28301",
    phone: "(910) 555-0103",
    description: "Premier barbershop offering classic cuts, fades, and beard grooming. Walk-ins welcome, appointments preferred.",
    website: "https://example.com/crownglory",
    lat: 35.0620, lng: -78.9075,
  },
  {
    id: "4",
    name: "Cape Fear Valley Wellness Center",
    category: "Health & Wellness",
    address: "1800 Owen Dr, Fayetteville, NC 28304",
    phone: "(910) 555-0104",
    description: "Comprehensive wellness services including chiropractic care, acupuncture, and nutritional counseling.",
    website: "https://example.com/cfvwellness",
    featured: true,
    lat: 35.0552, lng: -78.9311,
  },
  {
    id: "5",
    name: "Williams & Associates Law Firm",
    category: "Legal Services",
    address: "225 Green St, Suite 300, Fayetteville, NC 28301",
    phone: "(910) 555-0105",
    description: "Experienced attorneys handling family law, personal injury, and estate planning for the Cumberland County community.",
    website: "https://example.com/williamslaw",
    lat: 35.0527, lng: -78.8781,
  },
  {
    id: "6",
    name: "Sandhills Realty Group",
    category: "Real Estate",
    address: "4920 Raeford Rd, Fayetteville, NC 28304",
    phone: "(910) 555-0106",
    description: "Helping families find their dream homes in the Fayetteville and Fort Liberty area for over 20 years.",
    website: "https://example.com/sandhillsrealty",
    lat: 35.0393, lng: -78.9563,
  },
  {
    id: "7",
    name: "Fayetteville Technical Community College",
    category: "Education",
    address: "2201 Hull Rd, Fayetteville, NC 28303",
    phone: "(910) 678-8400",
    description: "Affordable higher education with over 200 degree, diploma, and certificate programs for career advancement.",
    website: "https://www.faytechcc.edu",
    lat: 35.0686, lng: -78.9337,
  },
  {
    id: "8",
    name: "New Beginnings Christian Church",
    category: "Churches",
    address: "980 Cliffdale Rd, Fayetteville, NC 28314",
    phone: "(910) 555-0108",
    description: "A welcoming worship community with Sunday services, youth programs, and active community outreach ministries.",
    lat: 35.0268, lng: -78.9640,
  },
  {
    id: "9",
    name: "The Comedy Zone Fayetteville",
    category: "Entertainment",
    address: "616 N Reilly Rd, Fayetteville, NC 28303",
    phone: "(910) 867-1950",
    description: "Live comedy shows every weekend featuring nationally touring comedians and local talent. Full bar and menu available.",
    website: "https://example.com/comedyzone",
    lat: 35.0725, lng: -78.9612,
  },
  {
    id: "10",
    name: "All-Pro Plumbing & HVAC",
    category: "Home Services",
    address: "3712 Sycamore Dairy Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0110",
    description: "Licensed and insured plumbing, heating, and cooling services. 24/7 emergency availability for Cumberland County.",
    website: "https://example.com/allproplumbing",
    lat: 35.0780, lng: -78.9200,
  },
  {
    id: "11",
    name: "Taste of Ethiopia",
    category: "Restaurants",
    address: "1475 Skibo Rd, Fayetteville, NC 28303",
    phone: "(910) 829-2222",
    description: "Authentic Ethiopian cuisine with traditional injera, spiced stews, and vegetarian platters. Dine-in and takeout.",
    website: "https://example.com/tasteofethiopia",
    lat: 35.0411, lng: -78.9475,
  },
  {
    id: "12",
    name: "Divine Beauty Studio",
    category: "Beauty & Barber",
    address: "2828 Raeford Rd, Suite 110, Fayetteville, NC 28301",
    phone: "(910) 555-0112",
    description: "Full-service beauty salon specializing in natural hair care, braids, locs, and color treatments.",
    website: "https://example.com/divinebeauty",
    featured: true,
    lat: 35.0460, lng: -78.9200,
  },
  {
    id: "13",
    name: "Grace Fellowship Baptist Church",
    category: "Churches",
    address: "450 Ramsey St, Fayetteville, NC 28301",
    phone: "(910) 555-0113",
    description: "Family-oriented church with dynamic worship, Bible study groups, and community food pantry serving since 1975.",
    lat: 35.0570, lng: -78.8850,
  },
  {
    id: "14",
    name: "Sandhills Pediatric Dentistry",
    category: "Health & Wellness",
    address: "1960 Morganton Rd, Suite 5, Fayetteville, NC 28305",
    phone: "(910) 555-0114",
    description: "Gentle, child-friendly dental care with a focus on preventive treatment and a fun, comfortable office environment.",
    website: "https://example.com/sandhillspediatric",
    lat: 35.0500, lng: -78.9400,
  },
  {
    id: "15",
    name: "Carolina Custom Builders",
    category: "Home Services",
    address: "5500 Yadkin Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0115",
    description: "Custom home building, renovations, and remodeling. Licensed general contractor serving the Sandhills region.",
    website: "https://example.com/carolinabuilders",
    lat: 35.0830, lng: -78.9530,
  },
];

// Fayetteville, NC center
const MAP_CENTER: [number, number] = [35.0527, -78.9236];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommunityDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "map" | "list">("split");
  const listRef = useRef<HTMLDivElement>(null);

  const filteredBusinesses = useMemo(() => {
    return BUSINESSES.filter((b) => {
      const matchesCategory = activeCategory === "All" || b.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { All: BUSINESSES.length };
    for (const b of BUSINESSES) {
      counts[b.category] = (counts[b.category] || 0) + 1;
    }
    return counts;
  }, []);

  const handleMarkerClick = useCallback((business: Business) => {
    setSelectedBusiness(business);
    // Scroll the card into view in the list
    setTimeout(() => {
      const el = document.getElementById(`business-card-${business.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }, []);

  const handleCardClick = useCallback((business: Business) => {
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  }, []);

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Hero with Streaming Channel Logos                                 */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-10 sm:px-10 sm:py-14">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 text-sm font-medium text-teal-400">
            <Building2 className="h-4 w-4" />
            Fayetteville, NC &middot; Cumberland County
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Community Directory
          </h1>
          <p className="mx-auto max-w-2xl text-slate-400 text-base sm:text-lg">
            Discover and support the local businesses and services that make our
            community strong. Search, browse, and navigate to businesses across
            the Fayetteville area.
          </p>

          {/* Streaming channel logos */}
          <div className="pt-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
              Powered by
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {CHANNELS.map((ch) => (
                <Link
                  key={ch.id}
                  href={ch.href}
                  className="group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-slate-800/60 border border-slate-700/50 transition-all hover:border-teal-500/50 hover:bg-slate-800 hover:scale-110"
                  title={ch.name}
                >
                  <Image
                    src={ch.logo}
                    alt={ch.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  {/* Tooltip */}
                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                    {ch.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Search + Filters + View Toggle                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              placeholder="Search businesses by name, category, or location…"
              className="pl-10 h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/50 p-0.5">
            {(["split", "map", "list"] as const).map((mode) => {
              const Icon = mode === "map" ? MapIcon : mode === "list" ? List : MapIcon;
              const label = mode === "split" ? "Split" : mode === "map" ? "Map" : "List";
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    viewMode === mode
                      ? "bg-teal-500/20 text-teal-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mode === "split" ? (
                    <>
                      <MapIcon className="h-3.5 w-3.5" />
                      <List className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
              activeCategory === "All"
                ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
            }`}
          >
            All
            <span className="rounded-full bg-slate-800 px-1.5 py-0 text-[10px]">
              {categoryCount["All"]}
            </span>
          </button>
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveCategory(label)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                activeCategory === label
                  ? `${CATEGORY_COLORS[label].badge}`
                  : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
              {categoryCount[label] ? (
                <span className="rounded-full bg-slate-800 px-1.5 py-0 text-[10px]">
                  {categoryCount[label]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Result count */}
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-300">{filteredBusinesses.length}</span>{" "}
          {filteredBusinesses.length === 1 ? "business" : "businesses"}
          {activeCategory !== "All" && (
            <>
              {" "}in{" "}
              <span className="font-medium text-slate-300">{activeCategory}</span>
            </>
          )}
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Map + Listings (Split / Map / List)                               */}
      {/* ----------------------------------------------------------------- */}
      <div
        className={`gap-4 ${
          viewMode === "split"
            ? "grid grid-cols-1 lg:grid-cols-2"
            : viewMode === "map"
            ? "grid grid-cols-1"
            : "grid grid-cols-1"
        }`}
      >
        {/* Map Panel */}
        {(viewMode === "split" || viewMode === "map") && (
          <div className={`${viewMode === "map" ? "h-[600px]" : "h-[500px]"} rounded-xl overflow-hidden border border-slate-800`}>
            <CommunityMap
              businesses={filteredBusinesses}
              selectedBusiness={selectedBusiness}
              onMarkerClick={handleMarkerClick}
              center={MAP_CENTER}
              categoryColors={CATEGORY_COLORS}
            />
          </div>
        )}

        {/* List Panel */}
        {(viewMode === "split" || viewMode === "list") && (
          <div
            ref={listRef}
            className={`space-y-3 ${
              viewMode === "split"
                ? "max-h-[500px] overflow-y-auto pr-1 scrollbar-thin"
                : ""
            }`}
          >
            {filteredBusinesses.length > 0 ? (
              viewMode === "list" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBusinesses.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business}
                      isSelected={selectedBusiness?.id === business.id}
                      onClick={() => handleCardClick(business)}
                    />
                  ))}
                </div>
              ) : (
                filteredBusinesses.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    isSelected={selectedBusiness?.id === business.id}
                    onClick={() => handleCardClick(business)}
                    compact
                  />
                ))
              )
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50">
                <Search className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">
                  No businesses found matching your search.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Add Your Business CTA                                             */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-teal-950/50 via-slate-900 to-purple-950/50 p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20">
            <Plus className="h-7 w-7 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Add Your Business
          </h2>
          <p className="text-slate-400">
            Are you a local business owner in the Fayetteville area? Get listed
            in the WCCG Community Directory and connect with thousands of
            community members who trust and support local businesses.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" className="bg-teal-600 hover:bg-teal-500 text-white" asChild>
              <Link href="/contact">
                <Plus className="mr-2 h-4 w-4" />
                Submit Your Business
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:text-white" asChild>
              <a href="tel:9104836111">
                <Phone className="mr-2 h-4 w-4" />
                Call (910) 483-6111
              </a>
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Listing is free for community members. Premium placement available.
          </p>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Business Card Sub-component
// ---------------------------------------------------------------------------

function BusinessCard({
  business,
  isSelected,
  onClick,
  compact,
}: {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`;
  const categoryColor = CATEGORY_COLORS[business.category];

  if (compact) {
    return (
      <div
        id={`business-card-${business.id}`}
        onClick={onClick}
        className={`flex gap-4 rounded-lg border p-4 cursor-pointer transition-all ${
          isSelected
            ? "border-teal-500/50 bg-teal-500/5 shadow-lg shadow-teal-500/5"
            : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50"
        }`}
      >
        {/* Color dot */}
        <div
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: categoryColor.marker }}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-white truncate">{business.name}</h3>
            {business.featured && (
              <Badge className="shrink-0 gap-1 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                <Star className="h-2.5 w-2.5" /> Featured
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">{business.description}</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {business.address.split(",")[0]}
            </span>
            <a href={`tel:${business.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 hover:text-teal-400">
              <Phone className="h-3 w-3" />
              {business.phone}
            </a>
          </div>
          <div className="flex gap-2 pt-1">
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Navigation className="h-3 w-3" /> Directions
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      id={`business-card-${business.id}`}
      onClick={onClick}
      className={`group relative flex flex-col justify-between cursor-pointer transition-all border-slate-800 bg-slate-900/30 ${
        isSelected
          ? "border-teal-500/50 bg-teal-500/5 shadow-lg shadow-teal-500/5 ring-1 ring-teal-500/20"
          : "hover:border-slate-700 hover:bg-slate-900/50"
      }`}
    >
      {business.featured && (
        <div className="absolute right-4 top-4">
          <Badge className="gap-1 bg-amber-500/20 text-amber-300 border-amber-500/30">
            <Star className="h-3 w-3" />
            Featured
          </Badge>
        </div>
      )}

      <CardHeader className="pb-0">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className={`w-fit text-xs ${categoryColor.badge}`}
          >
            {business.category}
          </Badge>
          <CardTitle className="text-base leading-snug text-white">
            {business.name}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <CardDescription className="line-clamp-2 text-slate-400">
          {business.description}
        </CardDescription>

        <div className="space-y-1.5 text-slate-500">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="text-xs leading-snug">{business.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`tel:${business.phone.replace(/\D/g, "")}`}
              className="text-xs hover:text-teal-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {business.phone}
            </a>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        {business.website && (
          <Button variant="outline" size="sm" asChild className="flex-1 border-slate-700 text-slate-400 hover:text-white text-xs h-8">
            <a href={business.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Globe className="mr-1 h-3 w-3" />
              Website
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild className="flex-1 border-slate-700 text-slate-400 hover:text-white text-xs h-8">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <Navigation className="mr-1 h-3 w-3" />
            Directions
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
