"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";

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

const CATEGORY_COLORS: Record<Category, string> = {
  Restaurants: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Auto Services": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Beauty & Barber": "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  "Health & Wellness": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Legal Services": "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
  "Real Estate": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Education: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Churches: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Entertainment: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "Home Services": "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

// ---------------------------------------------------------------------------
// Mock data -- 15 sample Fayetteville, NC businesses
// ---------------------------------------------------------------------------

const BUSINESSES: Business[] = [
  {
    id: "1",
    name: "Hilltop House Restaurant",
    category: "Restaurants",
    address: "1240 Fort Bragg Rd, Fayetteville, NC 28305",
    phone: "(910) 555-0101",
    description:
      "Southern comfort food made from scratch with locally sourced ingredients. A Fayetteville staple since 1998.",
    website: "https://example.com/hilltop",
    featured: true,
  },
  {
    id: "2",
    name: "Bragg Boulevard Auto Care",
    category: "Auto Services",
    address: "3450 Bragg Blvd, Fayetteville, NC 28303",
    phone: "(910) 555-0102",
    description:
      "Full-service auto repair and maintenance. ASE-certified technicians specializing in domestic and import vehicles.",
    website: "https://example.com/braggauto",
  },
  {
    id: "3",
    name: "Crown & Glory Barbershop",
    category: "Beauty & Barber",
    address: "512 Murchison Rd, Fayetteville, NC 28301",
    phone: "(910) 555-0103",
    description:
      "Premier barbershop offering classic cuts, fades, and beard grooming. Walk-ins welcome, appointments preferred.",
    website: "https://example.com/crownglory",
  },
  {
    id: "4",
    name: "Cape Fear Valley Wellness Center",
    category: "Health & Wellness",
    address: "1800 Owen Dr, Fayetteville, NC 28304",
    phone: "(910) 555-0104",
    description:
      "Comprehensive wellness services including chiropractic care, acupuncture, and nutritional counseling.",
    website: "https://example.com/cfvwellness",
    featured: true,
  },
  {
    id: "5",
    name: "Williams & Associates Law Firm",
    category: "Legal Services",
    address: "225 Green St, Suite 300, Fayetteville, NC 28301",
    phone: "(910) 555-0105",
    description:
      "Experienced attorneys handling family law, personal injury, and estate planning for the Cumberland County community.",
    website: "https://example.com/williamslaw",
  },
  {
    id: "6",
    name: "Sandhills Realty Group",
    category: "Real Estate",
    address: "4920 Raeford Rd, Fayetteville, NC 28304",
    phone: "(910) 555-0106",
    description:
      "Helping families find their dream homes in the Fayetteville and Fort Liberty area for over 20 years.",
    website: "https://example.com/sandhillsrealty",
  },
  {
    id: "7",
    name: "Fayetteville Technical Community College",
    category: "Education",
    address: "2201 Hull Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0107",
    description:
      "Affordable higher education with over 200 degree, diploma, and certificate programs for career advancement.",
    website: "https://example.com/ftcc",
  },
  {
    id: "8",
    name: "New Beginnings Christian Church",
    category: "Churches",
    address: "980 Cliffdale Rd, Fayetteville, NC 28314",
    phone: "(910) 555-0108",
    description:
      "A welcoming worship community with Sunday services, youth programs, and active community outreach ministries.",
  },
  {
    id: "9",
    name: "The Comedy Zone Fayetteville",
    category: "Entertainment",
    address: "616 N Reilly Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0109",
    description:
      "Live comedy shows every weekend featuring nationally touring comedians and local talent. Full bar and menu available.",
    website: "https://example.com/comedyzone",
  },
  {
    id: "10",
    name: "All-Pro Plumbing & HVAC",
    category: "Home Services",
    address: "3712 Sycamore Dairy Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0110",
    description:
      "Licensed and insured plumbing, heating, and cooling services. 24/7 emergency availability for Cumberland County.",
    website: "https://example.com/allproplumbing",
  },
  {
    id: "11",
    name: "Taste of Ethiopia",
    category: "Restaurants",
    address: "1475 Skibo Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0111",
    description:
      "Authentic Ethiopian cuisine with traditional injera, spiced stews, and vegetarian platters. Dine-in and takeout.",
    website: "https://example.com/tasteofethiopia",
  },
  {
    id: "12",
    name: "Divine Beauty Studio",
    category: "Beauty & Barber",
    address: "2828 Raeford Rd, Suite 110, Fayetteville, NC 28301",
    phone: "(910) 555-0112",
    description:
      "Full-service beauty salon specializing in natural hair care, braids, locs, and color treatments.",
    website: "https://example.com/divinebeauty",
    featured: true,
  },
  {
    id: "13",
    name: "Grace Fellowship Baptist Church",
    category: "Churches",
    address: "450 Ramsey St, Fayetteville, NC 28301",
    phone: "(910) 555-0113",
    description:
      "Family-oriented church with dynamic worship, Bible study groups, and community food pantry serving since 1975.",
  },
  {
    id: "14",
    name: "Sandhills Pediatric Dentistry",
    category: "Health & Wellness",
    address: "1960 Morganton Rd, Suite 5, Fayetteville, NC 28305",
    phone: "(910) 555-0114",
    description:
      "Gentle, child-friendly dental care with a focus on preventive treatment and a fun, comfortable office environment.",
    website: "https://example.com/sandhillspediatric",
  },
  {
    id: "15",
    name: "Carolina Custom Builders",
    category: "Home Services",
    address: "5500 Yadkin Rd, Fayetteville, NC 28303",
    phone: "(910) 555-0115",
    description:
      "Custom home building, renovations, and remodeling. Licensed general contractor serving the Sandhills region.",
    website: "https://example.com/carolinabuilders",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommunityDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

  const filteredBusinesses = useMemo(() => {
    return BUSINESSES.filter((b) => {
      const matchesCategory =
        activeCategory === "All" || b.category === activeCategory;
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

  return (
    <div className="space-y-10">
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="relative z-10 mx-auto max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" />
            Fayetteville, NC Area
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Community Directory
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Discover and support the local businesses and services that make our
            community strong. From restaurants to real estate, find trusted
            businesses right here in the WCCG family.
          </p>
        </div>
        {/* Decorative background circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary/5" />
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Search Bar                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative mx-auto max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search businesses by name, category, or location..."
          className="pl-10 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Category Grid                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Browse by Category
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeCategory === "All" ? "default" : "outline"}
            onClick={() => setActiveCategory("All")}
          >
            All
            <Badge
              variant="secondary"
              className="ml-1.5 text-[10px] px-1.5 py-0"
            >
              {categoryCount["All"]}
            </Badge>
          </Button>
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              size="sm"
              variant={activeCategory === label ? "default" : "outline"}
              onClick={() => setActiveCategory(label)}
            >
              <Icon className="mr-1 h-3.5 w-3.5" />
              {label}
              {categoryCount[label] ? (
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] px-1.5 py-0"
                >
                  {categoryCount[label]}
                </Badge>
              ) : null}
            </Button>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Business Listings                                                  */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {filteredBusinesses.length}
            </span>{" "}
            {filteredBusinesses.length === 1 ? "business" : "businesses"}
            {activeCategory !== "All" && (
              <>
                {" "}
                in{" "}
                <span className="font-medium text-foreground">
                  {activeCategory}
                </span>
              </>
            )}
          </p>
        </div>

        {filteredBusinesses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No businesses found matching your search.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Map Placeholder                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Find Businesses Near You
        </h2>
        <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 sm:h-80">
          <div className="text-center space-y-2">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              Interactive Map Coming Soon
            </p>
            <p className="text-xs text-muted-foreground/70">
              Fayetteville, NC &mdash; Cumberland County
            </p>
          </div>
          {/* Decorative grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Add Your Business CTA                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 p-8 sm:p-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Add Your Business
          </h2>
          <p className="text-muted-foreground">
            Are you a local business owner in the Fayetteville area? Get listed
            in the WCCG Community Directory and connect with thousands of
            community members who trust and support local businesses.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Submit Your Business
            </Button>
            <Button variant="outline" size="lg">
              <Phone className="mr-2 h-4 w-4" />
              Call (910) 483-6111
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70">
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

function BusinessCard({ business }: { business: Business }) {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`;

  return (
    <Card className="group relative flex flex-col justify-between transition-shadow hover:shadow-md">
      {business.featured && (
        <div className="absolute right-4 top-4">
          <Badge
            variant="secondary"
            className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          >
            <Star className="h-3 w-3" />
            Featured
          </Badge>
        </div>
      )}

      <CardHeader className="pb-0">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className={`w-fit border-transparent text-xs ${CATEGORY_COLORS[business.category]}`}
          >
            {business.category}
          </Badge>
          <CardTitle className="text-base leading-snug">
            {business.name}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <CardDescription className="line-clamp-2">
          {business.description}
        </CardDescription>

        <div className="space-y-1.5 text-muted-foreground">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="text-xs leading-snug">{business.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`tel:${business.phone.replace(/\D/g, "")}`}
              className="text-xs hover:text-foreground transition-colors"
            >
              {business.phone}
            </a>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        {business.website && (
          <Button variant="outline" size="xs" asChild className="flex-1">
            <a href={business.website} target="_blank" rel="noopener noreferrer">
              <Globe className="mr-1 h-3 w-3" />
              Visit Website
            </a>
          </Button>
        )}
        <Button variant="outline" size="xs" asChild className="flex-1">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="mr-1 h-3 w-3" />
            Get Directions
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
