"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
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
  X,
  Mic,
  Youtube,
  Clock,
  Users,
  ArrowRight,
  Play,
  Landmark,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Lazy-load the map component (Leaflet needs browser window)
// ---------------------------------------------------------------------------
const CommunityMap = dynamic(() => import("./community-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl border bg-gray-50">
      <div className="text-center space-y-2">
        <MapPin className="mx-auto h-8 w-8 text-teal-500 animate-pulse" />
        <p className="text-sm text-gray-400">Loading map…</p>
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
  city: string;
  county: string;
  phone: string;
  description: string;
  website?: string;
  imageUrl?: string;
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
  | "Home Services"
  | "Government & Services";

// ---------------------------------------------------------------------------
// Streaming Channels
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
// WCCG Programs — show data, bios, YouTube channels
// ---------------------------------------------------------------------------

interface Program {
  id: string;
  name: string;
  hosts: string;
  bio: string;
  schedule: string;
  image: string | null;
  youtube?: { name: string; url: string };
  href: string;
}

const PROGRAMS: Program[] = [
  {
    id: "show_streetz_morning",
    name: "Streetz Morning Takeover",
    hosts: "Yung Joc, Mz Shyneka & Shawty Shawty",
    bio: "Start your morning with the hottest conversations, celebrity interviews, and the best mix of hip hop and R&B. Yung Joc and the crew bring the energy every weekday morning with their unfiltered take on pop culture, entertainment news, and community topics that matter to Fayetteville.",
    schedule: "Weekdays 6:00 AM - 10:00 AM",
    image: "/images/shows/streetz-morning-takeover.png",
    youtube: { name: "Streetz Morning Takeover", url: "https://www.youtube.com/embed?listType=search&list=Streetz+Morning+Takeover+WCCG" },
    href: "/shows/show_streetz_morning",
  },
  {
    id: "show_angela_yee",
    name: "Way Up with Angela Yee",
    hosts: "Angela Yee",
    bio: "Award-winning radio personality Angela Yee delivers compelling conversations, celebrity interviews, and the latest in entertainment and lifestyle. From The Breakfast Club to Way Up, Angela brings her signature style of insightful dialogue and community engagement to midday radio.",
    schedule: "Weekdays 10:00 AM - 2:00 PM",
    image: "/images/hosts/angela-yee.png",
    youtube: { name: "Way Up with Angela Yee", url: "https://www.youtube.com/embed?listType=search&list=Way+Up+Angela+Yee" },
    href: "/shows/show_angela_yee",
  },
  {
    id: "show_posted_corner",
    name: "Posted on The Corner",
    hosts: "Incognito",
    bio: "Incognito keeps it real with the afternoon drive crowd, delivering the perfect mix of hip hop, breaking news, and Fayetteville community updates. Posted on The Corner is where culture meets conversation — raw, uncut, and always authentic.",
    schedule: "Weekdays 2:00 PM - 6:00 PM",
    image: "/images/hosts/incognito.png",
    youtube: { name: "Posted on The Corner", url: "https://www.youtube.com/embed?listType=search&list=Incognito+Posted+Corner" },
    href: "/shows/show_posted_corner",
  },
  {
    id: "show_bootleg_kev",
    name: "The Bootleg Kev Show",
    hosts: "Bootleg Kev",
    bio: "Bootleg Kev brings the freshest interviews with hip hop's biggest names. Known for his viral YouTube interviews with artists like Lil Baby, Moneybagg Yo, and more, Kev delivers exclusive conversations and the hottest new music every weeknight.",
    schedule: "Weekdays 6:00 PM - 10:00 PM",
    image: "/images/shows/bootleg-kev-show.png",
    youtube: { name: "Bootleg Kev", url: "https://www.youtube.com/embed?listType=search&list=Bootleg+Kev+Show" },
    href: "/shows/show_bootleg_kev",
  },
  {
    id: "show_shorty_corleone",
    name: "Crank with Shorty Corleone",
    hosts: "Shorty Corleone",
    bio: "The late-night energy belongs to Shorty Corleone. Crank delivers the hardest mixes, the newest underground tracks, and the vibes that keep Fayetteville moving after dark. It's where the nightlife meets the airwaves.",
    schedule: "Weekdays 10:00 PM - 2:00 AM",
    image: "/images/shows/crank-corleone.png",
    youtube: { name: "Crank with Shorty Corleone", url: "https://www.youtube.com/embed?listType=search&list=Shorty+Corleone+WCCG" },
    href: "/shows/show_shorty_corleone",
  },
  {
    id: "show_sunday_snacks",
    name: "Sunday Snacks",
    hosts: "WCCG Gospel Team",
    bio: "Feed your soul every Sunday morning with uplifting gospel music, inspirational messages, and community prayer. Sunday Snacks is the spiritual cornerstone of the WCCG family, bringing faith and fellowship to Cumberland County.",
    schedule: "Sundays 6:00 AM - 8:00 AM",
    image: null,
    href: "/shows/show_sunday_snacks",
  },
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
  { label: "Government & Services", icon: Landmark },
];

const CATEGORY_COLORS: Record<Category, { badge: string; marker: string }> = {
  Restaurants:              { badge: "bg-orange-500/20 text-orange-300 border-orange-500/30", marker: "#f97316" },
  "Auto Services":          { badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", marker: "#3b82f6" },
  "Beauty & Barber":        { badge: "bg-pink-500/20 text-pink-300 border-pink-500/30", marker: "#ec4899" },
  "Health & Wellness":      { badge: "bg-green-500/20 text-green-300 border-green-500/30", marker: "#22c55e" },
  "Legal Services":         { badge: "bg-slate-500/20 text-slate-300 border-slate-500/30", marker: "#64748b" },
  "Real Estate":            { badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", marker: "#f59e0b" },
  Education:                { badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", marker: "#6366f1" },
  Churches:                 { badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", marker: "#a855f7" },
  Entertainment:            { badge: "bg-rose-500/20 text-rose-300 border-rose-500/30", marker: "#f43f5e" },
  "Home Services":          { badge: "bg-teal-500/20 text-teal-300 border-teal-500/30", marker: "#14b8a6" },
  "Government & Services":  { badge: "bg-sky-500/20 text-sky-300 border-sky-500/30", marker: "#0ea5e9" },
};

// ---------------------------------------------------------------------------
// Counties & cities covered
// ---------------------------------------------------------------------------

const COUNTIES = ["Cumberland", "Hoke", "Robeson", "Harnett", "Sampson", "Bladen", "Moore"] as const;

// ---------------------------------------------------------------------------
// Directory Data — Cumberland & surrounding counties
// ---------------------------------------------------------------------------

const BUSINESSES: Business[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // CUMBERLAND COUNTY — Fayetteville, Spring Lake, Hope Mills
  // ════════════════════════════════════════════════════════════════════════════

  // ── Restaurants ──────────────────────────────────────────────────────────
  { id: "1", name: "Hilltop House Restaurant", category: "Restaurants", address: "1240 Fort Bragg Rd, Fayetteville, NC 28305", city: "Fayetteville", county: "Cumberland", phone: "(910) 484-6699", description: "Southern comfort food made from scratch with locally sourced ingredients. A Fayetteville staple since 1998.", website: "https://example.com/hilltop", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop", featured: true, lat: 35.0474, lng: -78.9120 },
  { id: "11", name: "Taste of Ethiopia", category: "Restaurants", address: "1475 Skibo Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 829-2222", description: "Authentic Ethiopian cuisine with traditional injera, spiced stews, and vegetarian platters. Dine-in and takeout.", website: "https://example.com/tasteofethiopia", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop", lat: 35.0411, lng: -78.9475 },
  { id: "16", name: "Pharaoh's Village", category: "Restaurants", address: "5804 Yadkin Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 864-5274", description: "Mediterranean and Middle Eastern cuisine featuring lamb kabobs, hummus platters, and freshly baked pita.", website: "https://example.com/pharaohsvillage", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop", lat: 35.0835, lng: -78.9440 },
  { id: "17", name: "Mash House Brewing", category: "Restaurants", address: "4150 Sycamore Dairy Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 867-9223", description: "Craft brewery and restaurant with house-brewed beers, wood-fired steaks, and a vibrant patio.", website: "https://example.com/mashhouse", imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop", featured: true, lat: 35.0770, lng: -78.9220 },
  { id: "18", name: "Island Style Wings & Seafood", category: "Restaurants", address: "2055 Skibo Rd, Suite 105, Fayetteville, NC 28314", city: "Fayetteville", county: "Cumberland", phone: "(910) 423-9464", description: "Caribbean-inspired wings, jerk seasonings, and fresh seafood combos. Quick service with bold island flavors.", imageUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop", lat: 35.0380, lng: -78.9530 },
  { id: "19", name: "Luigi's Italian Chophouse", category: "Restaurants", address: "4438 Legend Ave, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 223-1485", description: "Upscale Italian dining with hand-cut steaks, homemade pasta, and an extensive wine list.", website: "https://example.com/luigis", imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop", lat: 35.0760, lng: -78.9350 },

  // ── Auto Services ────────────────────────────────────────────────────────
  { id: "2", name: "Bragg Boulevard Auto Care", category: "Auto Services", address: "3450 Bragg Blvd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0102", description: "Full-service auto repair and maintenance. ASE-certified technicians for domestic and import vehicles.", website: "https://example.com/braggauto", imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop", lat: 35.0713, lng: -78.9436 },
  { id: "20", name: "Sandhills Tire & Auto", category: "Auto Services", address: "5601 Yadkin Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 864-3030", description: "New and used tires, brake service, oil changes, and alignment. Serving Fort Liberty families since 1992.", website: "https://example.com/sandhillstire", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", lat: 35.0820, lng: -78.9510 },
  { id: "21", name: "Precision Collision Center", category: "Auto Services", address: "1826 Owen Dr, Fayetteville, NC 28304", city: "Fayetteville", county: "Cumberland", phone: "(910) 484-2080", description: "Expert collision repair, paintless dent removal, and insurance claims assistance.", website: "https://example.com/precisioncollision", imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop", lat: 35.0555, lng: -78.9305 },
  { id: "22", name: "Quick Lane Auto Detailing", category: "Auto Services", address: "3210 Raeford Rd, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0122", description: "Premium auto detailing including ceramic coating, paint correction, and interior deep cleaning.", imageUrl: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop", lat: 35.0450, lng: -78.9250 },

  // ── Beauty & Barber ──────────────────────────────────────────────────────
  { id: "3", name: "Crown & Glory Barbershop", category: "Beauty & Barber", address: "512 Murchison Rd, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0103", description: "Premier barbershop offering classic cuts, fades, and beard grooming. Walk-ins welcome.", website: "https://example.com/crownglory", imageUrl: "https://images.unsplash.com/photo-1585747860019-024a6d6de9b8?w=400&h=300&fit=crop", lat: 35.0620, lng: -78.9075 },
  { id: "12", name: "Divine Beauty Studio", category: "Beauty & Barber", address: "2828 Raeford Rd, Suite 110, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0112", description: "Full-service beauty salon specializing in natural hair care, braids, locs, and color treatments.", website: "https://example.com/divinebeauty", imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop", featured: true, lat: 35.0460, lng: -78.9200 },
  { id: "23", name: "Legends Barbershop", category: "Beauty & Barber", address: "4551 Yadkin Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 860-0025", description: "Old-school vibes with modern techniques. Straight razor shaves, line-ups, and hot towel treatments.", website: "https://example.com/legends", imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop", lat: 35.0800, lng: -78.9480 },
  { id: "24", name: "Polished Nail Bar & Spa", category: "Beauty & Barber", address: "1916 Skibo Rd, Suite 500, Fayetteville, NC 28314", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0124", description: "Luxury nail care, spa pedicures, and lash extensions in a relaxing atmosphere.", website: "https://example.com/polishednailbar", imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop", lat: 35.0395, lng: -78.9510 },

  // ── Health & Wellness ────────────────────────────────────────────────────
  { id: "4", name: "Cape Fear Valley Wellness Center", category: "Health & Wellness", address: "1800 Owen Dr, Fayetteville, NC 28304", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0104", description: "Comprehensive wellness services including chiropractic care, acupuncture, and nutritional counseling.", website: "https://example.com/cfvwellness", imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop", featured: true, lat: 35.0552, lng: -78.9311 },
  { id: "14", name: "Sandhills Pediatric Dentistry", category: "Health & Wellness", address: "1960 Morganton Rd, Suite 5, Fayetteville, NC 28305", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0114", description: "Gentle, child-friendly dental care with a focus on preventive treatment.", website: "https://example.com/sandhillspediatric", imageUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop", lat: 35.0500, lng: -78.9400 },
  { id: "25", name: "Fort Liberty Family Pharmacy", category: "Health & Wellness", address: "2870 Legion Rd, Fayetteville, NC 28306", city: "Fayetteville", county: "Cumberland", phone: "(910) 424-3355", description: "Independent pharmacy with personalized service, free delivery, and compounding for military families.", website: "https://example.com/fortlibertyrx", imageUrl: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=300&fit=crop", lat: 35.0310, lng: -78.9080 },
  { id: "26", name: "Fayetteville Fitness Factory", category: "Health & Wellness", address: "1725 Walter Reed Rd, Fayetteville, NC 28304", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0126", description: "24/7 gym with personal training, group fitness classes, and a full free-weight area. Military discounts.", website: "https://example.com/fitnessfactory", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop", lat: 35.0540, lng: -78.9280 },

  // ── Legal Services ───────────────────────────────────────────────────────
  { id: "5", name: "Williams & Associates Law Firm", category: "Legal Services", address: "225 Green St, Suite 300, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0105", description: "Experienced attorneys handling family law, personal injury, and estate planning for Cumberland County.", website: "https://example.com/williamslaw", imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop", lat: 35.0527, lng: -78.8781 },
  { id: "27", name: "Sandhills Legal Aid", category: "Legal Services", address: "315 Dick St, Suite 200, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 483-0400", description: "Free and low-cost legal assistance for qualifying residents. Housing disputes, family law, and consumer rights.", website: "https://example.com/sandhillslegal", imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop", lat: 35.0535, lng: -78.8790 },
  { id: "28", name: "Cumberland County Mediation Services", category: "Legal Services", address: "130 Gillespie St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0128", description: "Professional mediation and conflict resolution for family, business, and community disputes.", lat: 35.0515, lng: -78.8770 },

  // ── Real Estate ──────────────────────────────────────────────────────────
  { id: "6", name: "Sandhills Realty Group", category: "Real Estate", address: "4920 Raeford Rd, Fayetteville, NC 28304", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0106", description: "Helping families find their dream homes in the Fayetteville and Fort Liberty area for over 20 years.", website: "https://example.com/sandhillsrealty", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop", lat: 35.0393, lng: -78.9563 },
  { id: "29", name: "Liberty Property Management", category: "Real Estate", address: "410 Hay St, Suite 100, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0129", description: "Residential property management for landlords and tenants. Maintenance coordination and tenant screening.", website: "https://example.com/libertyproperty", imageUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&h=300&fit=crop", lat: 35.0525, lng: -78.8810 },
  { id: "30", name: "Cape Fear Homes Realty", category: "Real Estate", address: "3307 Raeford Rd, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 481-1900", description: "First-time homebuyer specialists with VA loan expertise. Free consultations for military families.", website: "https://example.com/capefearhomes", imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop", featured: true, lat: 35.0445, lng: -78.9220 },

  // ── Education ────────────────────────────────────────────────────────────
  { id: "7", name: "Fayetteville Technical Community College", category: "Education", address: "2201 Hull Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 678-8400", description: "Affordable higher education with over 200 degree, diploma, and certificate programs.", website: "https://www.faytechcc.edu", imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop", lat: 35.0686, lng: -78.9337 },
  { id: "31", name: "Fayetteville State University", category: "Education", address: "1200 Murchison Rd, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 672-1111", description: "Historically Black university offering undergraduate and graduate programs. Home of the Broncos since 1867.", website: "https://www.uncfsu.edu", imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop", featured: true, lat: 35.0680, lng: -78.9070 },
  { id: "32", name: "Cross Creek Academy of Music", category: "Education", address: "135 Maxwell St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0132", description: "Music lessons for all ages — piano, guitar, drums, and voice. Group and private sessions.", website: "https://example.com/crosscreekmusic", imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop", lat: 35.0530, lng: -78.8800 },
  { id: "33", name: "Sandhills Computer Training Center", category: "Education", address: "2600 Raeford Rd, Suite 210, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0133", description: "IT certification courses, coding bootcamps, and digital literacy for workforce development.", website: "https://example.com/sandhillstech", imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop", lat: 35.0470, lng: -78.9180 },

  // ── Churches ─────────────────────────────────────────────────────────────
  { id: "8", name: "New Beginnings Christian Church", category: "Churches", address: "980 Cliffdale Rd, Fayetteville, NC 28314", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0108", description: "A welcoming worship community with Sunday services, youth programs, and active outreach ministries.", imageUrl: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=300&fit=crop", lat: 35.0268, lng: -78.9640 },
  { id: "13", name: "Grace Fellowship Baptist Church", category: "Churches", address: "450 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0113", description: "Family-oriented church with dynamic worship, Bible study groups, and community food pantry since 1975.", imageUrl: "https://images.unsplash.com/photo-1510936111840-65e151ad71bb?w=400&h=300&fit=crop", lat: 35.0570, lng: -78.8850 },
  { id: "34", name: "Greater Works Ministries", category: "Churches", address: "3100 Gillespie St, Fayetteville, NC 28306", city: "Fayetteville", county: "Cumberland", phone: "(910) 483-1234", description: "Vibrant multicultural ministry with Sunday worship, midweek Bible study, and youth mentorship.", lat: 35.0380, lng: -78.8950 },
  { id: "35", name: "Mount Sinai Missionary Baptist Church", category: "Churches", address: "716 Fisher St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 483-9911", description: "Historic congregation with a powerful gospel choir, children's ministry, and annual revival events.", lat: 35.0560, lng: -78.8900 },

  // ── Entertainment ────────────────────────────────────────────────────────
  { id: "9", name: "The Comedy Zone Fayetteville", category: "Entertainment", address: "616 N Reilly Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 867-1950", description: "Live comedy shows every weekend featuring nationally touring comedians and local talent.", website: "https://example.com/comedyzone", imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&h=300&fit=crop", lat: 35.0725, lng: -78.9612 },
  { id: "36", name: "Crown Complex Arena", category: "Entertainment", address: "1960 Coliseum Dr, Fayetteville, NC 28306", city: "Fayetteville", county: "Cumberland", phone: "(910) 438-4100", description: "Multi-venue entertainment complex hosting concerts, sporting events, and community festivals.", website: "https://example.com/crowncomplex", imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=300&fit=crop", featured: true, lat: 35.0330, lng: -78.8980 },
  { id: "37", name: "Dirtbag Ales Brewing", category: "Entertainment", address: "5435 Corporation Dr, Hope Mills, NC 28348", city: "Hope Mills", county: "Cumberland", phone: "(910) 426-2537", description: "Veteran-owned craft brewery with live music, trivia nights, and food trucks. Dog-friendly patio.", website: "https://example.com/dirtbagales", imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&h=300&fit=crop", lat: 35.0160, lng: -78.9530 },
  { id: "38", name: "Cameo Theatre", category: "Entertainment", address: "225 Hay St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 486-3836", description: "Historic downtown theater showcasing independent films and classic movie nights since 1928.", website: "https://example.com/cameotheatre", imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop", lat: 35.0525, lng: -78.8820 },

  // ── Home Services ────────────────────────────────────────────────────────
  { id: "10", name: "All-Pro Plumbing & HVAC", category: "Home Services", address: "3712 Sycamore Dairy Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0110", description: "Licensed plumbing, heating, and cooling services. 24/7 emergency availability for Cumberland County.", website: "https://example.com/allproplumbing", imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop", lat: 35.0780, lng: -78.9200 },
  { id: "15", name: "Carolina Custom Builders", category: "Home Services", address: "5500 Yadkin Rd, Fayetteville, NC 28303", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0115", description: "Custom home building, renovations, and remodeling. Licensed general contractor serving the Sandhills.", website: "https://example.com/carolinabuilders", imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop", lat: 35.0830, lng: -78.9530 },
  { id: "39", name: "Sandhills Lawn & Landscape", category: "Home Services", address: "2410 Hope Mills Rd, Fayetteville, NC 28306", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0139", description: "Commercial and residential landscaping, lawn maintenance, hardscaping, and seasonal cleanup.", website: "https://example.com/sandhillslawn", imageUrl: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&h=300&fit=crop", lat: 35.0300, lng: -78.9100 },
  { id: "40", name: "Cumberland Electrical Services", category: "Home Services", address: "4800 Raeford Rd, Fayetteville, NC 28304", city: "Fayetteville", county: "Cumberland", phone: "(910) 555-0140", description: "Residential and commercial electrical work including panel upgrades, rewiring, and generators.", website: "https://example.com/cumberlandelectric", imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop", lat: 35.0400, lng: -78.9550 },

  // ── Government & Services — Cumberland County ────────────────────────────
  { id: "41", name: "Cumberland County Courthouse", category: "Government & Services", address: "117 Dick St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 475-3000", description: "County courthouse handling civil and criminal cases, traffic court, and legal filings for Cumberland County.", website: "https://www.co.cumberland.nc.us", imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop", featured: true, lat: 35.0520, lng: -78.8780 },
  { id: "42", name: "Cumberland County Department of Social Services", category: "Government & Services", address: "1225 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 323-1540", description: "Social services including food assistance, Medicaid, child welfare, and aging services for residents.", website: "https://www.co.cumberland.nc.us/dss", imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop", lat: 35.0590, lng: -78.8870 },
  { id: "43", name: "Fayetteville Public Library", category: "Government & Services", address: "400 Maiden Ln, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 483-7727", description: "Public library system with free internet access, educational programs, children's story time, and community meeting rooms.", website: "https://www.cumberland.lib.nc.us", imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=300&fit=crop", lat: 35.0550, lng: -78.8830 },
  { id: "44", name: "Cumberland County Health Department", category: "Government & Services", address: "1235 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-3600", description: "Public health services including immunizations, WIC, family planning, STD testing, and environmental health.", website: "https://co.cumberland.nc.us/health", imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop", lat: 35.0593, lng: -78.8865 },
  { id: "45", name: "City of Fayetteville — City Hall", category: "Government & Services", address: "433 Hay St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-1990", description: "Municipal government offices for permits, utility billing, code enforcement, and city council meetings.", website: "https://www.fayettevillenc.gov", imageUrl: "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop", lat: 35.0530, lng: -78.8800 },
  { id: "46", name: "Veteran's Affairs Medical Center", category: "Government & Services", address: "2300 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 488-2120", description: "VA healthcare facility providing medical, mental health, and specialty care for veterans and their families.", website: "https://www.va.gov/fayetteville-nc-health-care", imageUrl: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=300&fit=crop", featured: true, lat: 35.0650, lng: -78.8900 },
  { id: "47", name: "Spring Lake Town Hall", category: "Government & Services", address: "300 Ruth St, Spring Lake, NC 28390", city: "Spring Lake", county: "Cumberland", phone: "(910) 436-0241", description: "Municipal services for Spring Lake including water billing, permits, parks and recreation, and town council.", website: "https://www.spring-lake.org", lat: 35.1730, lng: -78.9720 },
  { id: "48", name: "Hope Mills Town Hall", category: "Government & Services", address: "5770 Rockfish Rd, Hope Mills, NC 28348", city: "Hope Mills", county: "Cumberland", phone: "(910) 424-4555", description: "Municipal government for Hope Mills — permits, utilities, parks programming, and community events.", website: "https://www.townofhopemills.com", lat: 35.0100, lng: -78.9500 },

  // ════════════════════════════════════════════════════════════════════════════
  // HOKE COUNTY — Raeford
  // ════════════════════════════════════════════════════════════════════════════
  { id: "50", name: "Hoke County Government Center", category: "Government & Services", address: "227 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-8751", description: "County government offices for Hoke County including tax, permitting, register of deeds, and board meetings.", website: "https://www.hokecounty.net", imageUrl: "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop", featured: true, lat: 35.0015, lng: -79.2245 },
  { id: "51", name: "Raeford Family Diner", category: "Restaurants", address: "109 S Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-3200", description: "Down-home Southern cooking with breakfast all day, daily lunch specials, and homemade desserts.", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop", lat: 35.0010, lng: -79.2240 },
  { id: "52", name: "Hoke County Health Department", category: "Government & Services", address: "683 E Palmer St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-3717", description: "Public health services for Hoke County — immunizations, prenatal care, WIC, and communicable disease testing.", lat: 35.0025, lng: -79.2180 },
  { id: "53", name: "Hoke County Public Library", category: "Government & Services", address: "334 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-2502", description: "Public library serving Hoke County with book lending, computer access, children's programs, and meeting rooms.", lat: 35.0020, lng: -79.2250 },

  // ════════════════════════════════════════════════════════════════════════════
  // ROBESON COUNTY — Lumberton, Pembroke, St. Pauls
  // ════════════════════════════════════════════════════════════════════════════
  { id: "54", name: "Robeson County Courthouse", category: "Government & Services", address: "500 N Elm St, Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 671-3000", description: "County courthouse for civil and criminal proceedings, register of deeds, and county commissioners meetings.", website: "https://www.co.robeson.nc.us", imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop", featured: true, lat: 34.6182, lng: -79.0066 },
  { id: "55", name: "UNC Pembroke", category: "Education", address: "1 University Dr, Pembroke, NC 28372", city: "Pembroke", county: "Robeson", phone: "(910) 521-6000", description: "Public university offering 41 undergraduate and 18 graduate programs. Home of the Braves, proudly serving since 1887.", website: "https://www.uncp.edu", imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop", featured: true, lat: 34.6815, lng: -79.1902 },
  { id: "56", name: "Fuller's Old-Fashioned BBQ", category: "Restaurants", address: "3201 Roberts Ave, Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 738-8694", description: "Eastern NC-style barbecue with vinegar-based sauce, slow-smoked pork, and homemade hushpuppies.", imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop", lat: 34.6305, lng: -79.0120 },
  { id: "57", name: "Robeson County Health Department", category: "Government & Services", address: "460 Country Club Rd, Lumberton, NC 28360", city: "Lumberton", county: "Robeson", phone: "(910) 671-3200", description: "Public health clinic with immunizations, dental care, prenatal services, and health education programs.", lat: 34.6280, lng: -79.0200 },
  { id: "58", name: "Town of St. Pauls", category: "Government & Services", address: "207 W Blue St, St. Pauls, NC 28384", city: "St. Pauls", county: "Robeson", phone: "(910) 865-4178", description: "Municipal government for St. Pauls — water and sewer billing, code enforcement, and community programs.", lat: 34.8060, lng: -78.9710 },

  // ════════════════════════════════════════════════════════════════════════════
  // HARNETT COUNTY — Lillington, Dunn, Erwin
  // ════════════════════════════════════════════════════════════════════════════
  { id: "59", name: "Harnett County Government Complex", category: "Government & Services", address: "305 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-7555", description: "County administrative offices including tax, permits, social services, and the board of commissioners.", website: "https://www.harnett.org", imageUrl: "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop", featured: true, lat: 35.3960, lng: -78.8110 },
  { id: "60", name: "Dunn Area Chamber of Commerce", category: "Government & Services", address: "209 W Divine St, Dunn, NC 28334", city: "Dunn", county: "Harnett", phone: "(910) 892-4113", description: "Business support and community development organization for the Dunn area and southern Harnett County.", website: "https://www.dunnchamber.com", lat: 35.3060, lng: -78.6080 },
  { id: "61", name: "Sherry's Bakery", category: "Restaurants", address: "113 E Broad St, Dunn, NC 28334", city: "Dunn", county: "Harnett", phone: "(910) 892-8825", description: "Beloved local bakery known for fresh bread, pastries, custom cakes, and Southern-style lunch specials.", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop", lat: 35.3070, lng: -78.6070 },
  { id: "62", name: "Campbell University", category: "Education", address: "143 Main St, Buies Creek, NC 27506", city: "Buies Creek", county: "Harnett", phone: "(910) 893-1200", description: "Private university with programs in pharmacy, law, business, and divinity. Home of the Fighting Camels.", website: "https://www.campbell.edu", imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop", featured: true, lat: 35.3840, lng: -78.7400 },
  { id: "63", name: "Harnett County Health Department", category: "Government & Services", address: "307 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-7550", description: "Public health for Harnett County — immunizations, WIC, family planning, dental clinic, and health education.", lat: 35.3965, lng: -78.8115 },

  // ════════════════════════════════════════════════════════════════════════════
  // SAMPSON COUNTY — Clinton
  // ════════════════════════════════════════════════════════════════════════════
  { id: "64", name: "Sampson County Courthouse", category: "Government & Services", address: "101 E Main St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-6308", description: "County courthouse for Sampson County — civil, criminal, and traffic courts plus the register of deeds.", website: "https://www.sampsonnc.com", imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop", lat: 35.0125, lng: -78.3233 },
  { id: "65", name: "Sampson Regional Medical Center", category: "Health & Wellness", address: "607 Beaman St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-8511", description: "Full-service hospital with emergency care, surgery, imaging, and outpatient clinics serving Sampson County.", website: "https://www.sampsonrmc.org", imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop", featured: true, lat: 35.0140, lng: -78.3200 },
  { id: "66", name: "Sampson County Health Department", category: "Government & Services", address: "360 County Complex Rd, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-1131", description: "County health services including immunizations, WIC, prenatal care, and environmental health inspections.", lat: 35.0110, lng: -78.3250 },

  // ════════════════════════════════════════════════════════════════════════════
  // BLADEN COUNTY — Elizabethtown
  // ════════════════════════════════════════════════════════════════════════════
  { id: "67", name: "Bladen County Government", category: "Government & Services", address: "106 E Broad St, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6700", description: "Bladen County administrative offices — tax, planning, elections, and social services for residents.", website: "https://www.bladenco.org", imageUrl: "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop", lat: 34.6295, lng: -78.6050 },
  { id: "68", name: "Bladen Community College", category: "Education", address: "7418 NC-41 Hwy, Dublin, NC 28332", city: "Dublin", county: "Bladen", phone: "(910) 879-5500", description: "Community college offering associate degrees, certificates, and continuing education for Bladen County.", website: "https://www.bladencc.edu", imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop", lat: 34.6650, lng: -78.7290 },
  { id: "69", name: "Bladen County Health Department", category: "Government & Services", address: "300 Mercer Mill Rd, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6900", description: "Public health services for Bladen County — vaccinations, family planning, dental, and environmental health.", lat: 34.6310, lng: -78.6080 },

  // ════════════════════════════════════════════════════════════════════════════
  // MOORE COUNTY — Southern Pines, Aberdeen, Carthage
  // ════════════════════════════════════════════════════════════════════════════
  { id: "70", name: "Moore County Government Center", category: "Government & Services", address: "1 Courthouse Square, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-6363", description: "Moore County administrative offices — tax, permits, register of deeds, and county commissioners.", website: "https://www.moorecountync.gov", imageUrl: "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop", featured: true, lat: 35.3447, lng: -79.4170 },
  { id: "71", name: "Sandhills Community College", category: "Education", address: "3395 Airport Rd, Pinehurst, NC 28374", city: "Pinehurst", county: "Moore", phone: "(910) 692-6185", description: "Community college with academic transfer, career, and continuing education programs in the Sandhills region.", website: "https://www.sandhills.edu", imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop", lat: 35.2230, lng: -79.4010 },
  { id: "72", name: "Southern Pines Brewing Company", category: "Restaurants", address: "170 NW Broad St, Southern Pines, NC 28387", city: "Southern Pines", county: "Moore", phone: "(910) 693-1767", description: "Local craft brewery serving handcrafted ales and lagers with a rotating food truck lineup and live music.", website: "https://example.com/southernpinesbrewing", imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&h=300&fit=crop", lat: 35.1740, lng: -79.3940 },
  { id: "73", name: "Moore County Health Department", category: "Government & Services", address: "705 Pinehurst Ave, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-3300", description: "Public health services including clinical care, WIC, environmental health, and emergency preparedness.", lat: 35.3430, lng: -79.4160 },
];

const MAP_CENTER: [number, number] = [35.0527, -78.9236];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommunityDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [activeCounty, setActiveCounty] = useState<string>("All");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeProgram, setActiveProgram] = useState<Program>(PROGRAMS[0]);
  const listRef = useRef<HTMLDivElement>(null);

  // ── API-backed directory data (falls back to hardcoded BUSINESSES) ──
  const [businesses, setBusinesses] = useState<Business[]>(BUSINESSES);

  useEffect(() => {
    let cancelled = false;
    async function fetchListings() {
      try {
        const data = await apiClient<any[]>("/directory");
        if (!cancelled && data && data.length > 0) {
          // Map API camelCase response → Business interface
          const mapped: Business[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category as Category,
            address: item.address ?? "",
            city: item.city ?? "",
            county: item.county ?? "",
            phone: item.phone ?? "",
            description: item.description ?? "",
            website: item.website ?? undefined,
            imageUrl: item.imageUrl ?? undefined,
            featured: item.featured ?? false,
            lat: item.lat ?? 0,
            lng: item.lng ?? 0,
          }));
          setBusinesses(mapped);
        }
      } catch {
        // API unavailable — keep hardcoded fallback (already set as initial state)
      }
    }
    fetchListings();
    return () => { cancelled = true; };
  }, []);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesCategory = activeCategory === "All" || b.category === activeCategory;
      const matchesCounty = activeCounty === "All" || b.county === activeCounty;
      const matchesSearch =
        searchQuery.trim() === "" ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.county.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCounty && matchesSearch;
    });
  }, [searchQuery, activeCategory, activeCounty]);

  const categoryCount = useMemo(() => {
    const base = businesses.filter((b) => activeCounty === "All" || b.county === activeCounty);
    const counts: Record<string, number> = { All: base.length };
    for (const b of base) {
      counts[b.category] = (counts[b.category] || 0) + 1;
    }
    return counts;
  }, [activeCounty, businesses]);

  const countyCount = useMemo(() => {
    const counts: Record<string, number> = { All: businesses.length };
    for (const b of businesses) {
      counts[b.county] = (counts[b.county] || 0) + 1;
    }
    return counts;
  }, [businesses]);

  const handleMarkerClick = useCallback((business: Business) => {
    setSelectedBusiness(business);
    setTimeout(() => {
      const el = document.getElementById(`business-card-${business.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }, []);

  const handleCardClick = useCallback((business: Business) => {
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  }, []);

  return (
    <div className="space-y-10">
      {/* ================================================================= */}
      {/* Hero with Streaming Channel Logos                                 */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 text-sm font-medium text-teal-400">
            <Building2 className="h-4 w-4" />
            Serving {COUNTIES.length} Counties &middot; {businesses.length}+ Listings
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Community Directory
          </h1>
          <p className="mx-auto max-w-2xl text-slate-400 text-base sm:text-lg">
            Discover local businesses, government services, and community resources across
            Cumberland County and the surrounding region.
          </p>

          {/* Streaming channel logos */}
          <div className="pt-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">Our Channels</p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {CHANNELS.map((ch) => (
                <Link
                  key={ch.id}
                  href={ch.href}
                  className="group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-slate-800/60 border border-slate-700/50 transition-all hover:border-teal-500/50 hover:bg-slate-800 hover:scale-110"
                  title={ch.name}
                >
                  <Image src={ch.logo} alt={ch.name} width={40} height={40} className="rounded-full object-cover" />
                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                    {ch.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Programs & Shows — Bios + YouTube Feeds                          */}
      {/* ================================================================= */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Mic className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Our Programs</h2>
            <p className="text-sm text-slate-400">Meet the voices of WCCG 104.5 FM</p>
          </div>
        </div>

        {/* Program selector tabs */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {PROGRAMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProgram(p)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border p-3 pr-5 transition-all ${
                activeProgram.id === p.id
                  ? "border-teal-500/50 bg-teal-500/5"
                  : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
              }`}
            >
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-teal-500">
                {p.image ? (
                  <Image src={p.image} alt={p.name} width={40} height={40} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <div className="text-left min-w-0">
                <p className={`text-sm font-semibold truncate ${activeProgram.id === p.id ? "text-teal-400" : "text-white"}`}>
                  {p.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{p.hosts}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Active program detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bio panel */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-teal-500">
                {activeProgram.image ? (
                  <Image src={activeProgram.image} alt={activeProgram.name} width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Radio className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">{activeProgram.name}</h3>
                <p className="text-sm text-teal-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {activeProgram.hosts}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {activeProgram.schedule}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{activeProgram.bio}</p>
            <div className="flex gap-3">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white" asChild>
                <Link href={activeProgram.href}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Listen Now
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white" asChild>
                <Link href={activeProgram.href}>
                  View Full Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* YouTube panel */}
          <div>
            {activeProgram.youtube ? (
              <div className="space-y-3">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black">
                  <iframe
                    src={activeProgram.youtube.url}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${activeProgram.youtube.name} videos`}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5">
                  <Youtube className="h-3.5 w-3.5 text-red-500" />
                  Latest videos from {activeProgram.youtube.name}
                </p>
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30">
                <div className="text-center space-y-2">
                  <Youtube className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">YouTube content coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Directory — Map (RIGHT) + List (LEFT)                            */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20">
            <MapPin className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Local Directory</h2>
            <p className="text-sm text-slate-400">Search and navigate to community businesses &amp; services</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="search"
            placeholder="Search by name, category, city, or county…"
            className="pl-10 h-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* County filter */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">County</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCounty("All")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                activeCounty === "All"
                  ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
                  : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
              }`}
            >
              All Counties <span className="rounded-full bg-slate-800 px-1.5 py-0 text-[10px]">{countyCount["All"]}</span>
            </button>
            {COUNTIES.map((county) => (
              <button
                key={county}
                onClick={() => setActiveCounty(county)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                  activeCounty === county
                    ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
                    : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
                }`}
              >
                {county}
                {countyCount[county] ? (
                  <span className="rounded-full bg-slate-800 px-1.5 py-0 text-[10px]">{countyCount[county]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                activeCategory === "All"
                  ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                  : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
              }`}
            >
              All <span className="rounded-full bg-slate-800 px-1.5 py-0 text-[10px]">{categoryCount["All"]}</span>
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
                  <span className="rounded-full bg-slate-800 px-1.5 py-0 text-[10px]">{categoryCount[label]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-300">{filteredBusinesses.length}</span>{" "}
          {filteredBusinesses.length === 1 ? "listing" : "listings"}
          {activeCategory !== "All" && (
            <> in <span className="font-medium text-slate-300">{activeCategory}</span></>
          )}
          {activeCounty !== "All" && (
            <> &middot; <span className="font-medium text-slate-300">{activeCounty} County</span></>
          )}
        </p>

        {/* Split: List LEFT, Map RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List panel — LEFT */}
          <div ref={listRef} className="max-h-[600px] overflow-y-auto space-y-3 pr-1 scrollbar-thin lg:order-1">
            {filteredBusinesses.length > 0 ? (
              filteredBusinesses.map((business) => (
                <CompactCard
                  key={business.id}
                  business={business}
                  isSelected={selectedBusiness?.id === business.id}
                  onClick={() => handleCardClick(business)}
                />
              ))
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50">
                <Search className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">No listings found.</p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveCategory("All"); setActiveCounty("All"); }}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Map panel — RIGHT */}
          <div className="h-[600px] rounded-xl overflow-hidden border border-slate-700/50 shadow-lg lg:order-2">
            <CommunityMap
              businesses={filteredBusinesses}
              selectedBusiness={selectedBusiness}
              onMarkerClick={handleMarkerClick}
              center={MAP_CENTER}
              categoryColors={CATEGORY_COLORS}
            />
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Add Your Business CTA                                             */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-teal-950/50 via-slate-900 to-purple-950/50 p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20">
            <Plus className="h-7 w-7 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Add Your Business</h2>
          <p className="text-slate-400">
            Are you a local business owner in Cumberland County or the surrounding area? Get listed in the WCCG
            Community Directory and connect with thousands of community members.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" className="bg-teal-600 hover:bg-teal-500 text-white" asChild>
              <Link href="/my/directory"><Plus className="mr-2 h-4 w-4" /> Submit Your Business</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:text-white" asChild>
              <a href="tel:9104836111"><Phone className="mr-2 h-4 w-4" /> Call (910) 483-6111</a>
            </Button>
          </div>
          <p className="text-xs text-slate-500">Free listing for community members. Premium placement available.</p>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact Business Card with Image
// ---------------------------------------------------------------------------

function CompactCard({
  business,
  isSelected,
  onClick,
}: {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
}) {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`;
  const categoryColor = CATEGORY_COLORS[business.category];

  return (
    <div
      id={`business-card-${business.id}`}
      onClick={onClick}
      className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-teal-500/50 bg-teal-500/5 shadow-lg shadow-teal-500/5"
          : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50"
      }`}
    >
      {/* Business image */}
      {business.imageUrl ? (
        <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-slate-800">
          <Image
            src={business.imageUrl}
            alt={business.name}
            width={64}
            height={64}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800/60">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: categoryColor.marker }} />
        </div>
      )}

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
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.city}, {business.county} Co.</span>
          <a href={`tel:${business.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 hover:text-teal-400" onClick={(e) => e.stopPropagation()}>
            <Phone className="h-3 w-3" />{business.phone}
          </a>
        </div>
        <div className="flex gap-2 pt-0.5">
          {business.website && (
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Navigation className="h-3 w-3" /> Directions
          </a>
        </div>
      </div>
    </div>
  );
}
