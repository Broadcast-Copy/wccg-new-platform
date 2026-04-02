"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import dynamic from "next/dynamic";
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
  Shield,
  Flame,
  Zap,
  Bus,
  Landmark,
  Scale,
  HeartPulse,
  BookOpen,
  Trees,
  Swords,
  Plus,
  Star,
  X,
  UserCheck,
  Building2,
  Droplets,
  Hospital,
  Users,
  Trash2,
  PawPrint,
  Wheat,
  Medal,
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
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceListing {
  id: string;
  name: string;
  category: Category;
  address: string;
  city: string;
  county: string;
  phone: string;
  description: string;
  website?: string;
  featured?: boolean;
  claimed?: boolean;
  lat: number;
  lng: number;
}

type Category =
  | "Police & Sheriff"
  | "Fire & EMS"
  | "Utilities"
  | "Transportation"
  | "Government Offices"
  | "Courts & Legal"
  | "Health Services"
  | "Hospitals"
  | "Senior & Social Services"
  | "Libraries & Education"
  | "Parks & Recreation"
  | "Waste Management"
  | "Animal Services"
  | "Agriculture"
  | "Military"
  | "Veteran Services";

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORIES: { label: Category; icon: React.ElementType }[] = [
  { label: "Police & Sheriff", icon: Shield },
  { label: "Fire & EMS", icon: Flame },
  { label: "Hospitals", icon: Hospital },
  { label: "Health Services", icon: HeartPulse },
  { label: "Senior & Social Services", icon: Users },
  { label: "Utilities", icon: Zap },
  { label: "Waste Management", icon: Trash2 },
  { label: "Transportation", icon: Bus },
  { label: "Government Offices", icon: Landmark },
  { label: "Courts & Legal", icon: Scale },
  { label: "Animal Services", icon: PawPrint },
  { label: "Agriculture", icon: Wheat },
  { label: "Libraries & Education", icon: BookOpen },
  { label: "Parks & Recreation", icon: Trees },
  { label: "Military", icon: Swords },
  { label: "Veteran Services", icon: Medal },
];

const CATEGORY_COLORS: Record<Category, { badge: string; marker: string }> = {
  "Police & Sheriff":       { badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30", marker: "#3b82f6" },
  "Fire & EMS":             { badge: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30", marker: "#ef4444" },
  Hospitals:                { badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30", marker: "#f43f5e" },
  "Health Services":        { badge: "bg-green-500/15 text-green-600 dark:text-green-300 border-green-500/30", marker: "#22c55e" },
  "Senior & Social Services": { badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30", marker: "#8b5cf6" },
  Utilities:                { badge: "bg-amber-500/15 text-amber-600 dark:text-amber-500 dark:text-amber-300 border-amber-500/30", marker: "#f59e0b" },
  "Waste Management":       { badge: "bg-stone-500/15 text-stone-600 dark:text-stone-300 border-stone-500/30", marker: "#78716c" },
  Transportation:           { badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", marker: "#10b981" },
  "Government Offices":     { badge: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30", marker: "#0ea5e9" },
  "Courts & Legal":         { badge: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30", marker: "#64748b" },
  "Animal Services":        { badge: "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30", marker: "#ec4899" },
  Agriculture:              { badge: "bg-lime-500/15 text-lime-600 dark:text-lime-300 border-lime-500/30", marker: "#84cc16" },
  "Libraries & Education":  { badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30", marker: "#6366f1" },
  "Parks & Recreation":     { badge: "bg-teal-500/15 text-teal-600 dark:text-teal-500 dark:text-teal-300 border-teal-500/30", marker: "#14b8a6" },
  Military:                 { badge: "bg-orange-500/15 text-orange-600 dark:text-orange-500 dark:text-orange-300 border-orange-500/30", marker: "#f97316" },
  "Veteran Services":       { badge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30", marker: "#06b6d4" },
};

// ---------------------------------------------------------------------------
// Counties & areas covered (Fort Liberty is a military installation, not a county)
// ---------------------------------------------------------------------------

const COUNTIES = ["Cumberland", "Sampson", "Bladen", "Hoke", "Lee", "Scotland", "Moore", "Robeson", "Harnett"] as const;
const AREAS = [...COUNTIES, "Fort Liberty"] as const;

// ---------------------------------------------------------------------------
// Government Services Directory Data
// ---------------------------------------------------------------------------

const SERVICE_LISTINGS: ServiceListing[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // CUMBERLAND COUNTY — Fayetteville, Spring Lake, Hope Mills, Fort Liberty
  // ════════════════════════════════════════════════════════════════════════════

  // ── Police & Sheriff ─────────────────────────────────────────────────────
  { id: "c01", name: "Fayetteville Police Department", category: "Police & Sheriff", address: "467 Hay St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-1529", description: "City of Fayetteville law enforcement — non-emergency dispatch, community policing, and crime prevention.", website: "https://www.fayettevillenc.gov/police", featured: true, lat: 35.0527, lng: -78.8790 },
  { id: "c02", name: "Cumberland County Sheriff's Office", category: "Police & Sheriff", address: "131 Dick St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 323-1500", description: "County sheriff providing law enforcement, civil process, and detention services for all of Cumberland County.", website: "https://www.ccsonc.org", featured: true, lat: 35.0530, lng: -78.8775 },
  { id: "c03", name: "Spring Lake Police Department", category: "Police & Sheriff", address: "300 Ruth St, Spring Lake, NC 28390", city: "Spring Lake", county: "Cumberland", phone: "(910) 436-0297", description: "Municipal police for Spring Lake — patrol, investigations, and community engagement near Fort Liberty.", lat: 35.1730, lng: -78.9720 },
  { id: "c04", name: "Hope Mills Police Department", category: "Police & Sheriff", address: "5770 Rockfish Rd, Hope Mills, NC 28348", city: "Hope Mills", county: "Cumberland", phone: "(910) 425-4103", description: "Police services for the Town of Hope Mills including patrol, criminal investigations, and code enforcement.", lat: 35.0100, lng: -78.9500 },

  // ── Fire & EMS ───────────────────────────────────────────────────────────
  { id: "c05", name: "Fayetteville Fire Department", category: "Fire & EMS", address: "433 Hay St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-1698", description: "City fire department with 20+ stations providing fire suppression, rescue, and hazmat response.", website: "https://www.fayettevillenc.gov/fire", lat: 35.0530, lng: -78.8800 },
  { id: "c06", name: "Cumberland County Emergency Services", category: "Fire & EMS", address: "690 Medical Dr, Fayetteville, NC 28304", city: "Fayetteville", county: "Cumberland", phone: "(910) 321-6736", description: "County 911 center, emergency management, and EMS coordination for Cumberland County.", website: "https://www.co.cumberland.nc.us/departments/emergency-services", lat: 35.0555, lng: -78.9310 },
  { id: "c07", name: "Spring Lake Fire Department", category: "Fire & EMS", address: "171 S Main St, Spring Lake, NC 28390", city: "Spring Lake", county: "Cumberland", phone: "(910) 436-2544", description: "Fire and rescue services for Spring Lake including fire suppression and first responder EMS.", lat: 35.1725, lng: -78.9705 },
  { id: "c08", name: "Hope Mills Fire Department", category: "Fire & EMS", address: "5566 Trade St, Hope Mills, NC 28348", city: "Hope Mills", county: "Cumberland", phone: "(910) 424-4242", description: "Fire protection and emergency response for Hope Mills and surrounding Cumberland County.", lat: 35.0130, lng: -78.9480 },

  // ── Utilities ────────────────────────────────────────────────────────────
  { id: "c09", name: "Fayetteville PWC (Public Works Commission)", category: "Utilities", address: "955 Old Wilmington Rd, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 483-1382", description: "Water, electric, and sewer utility services for Fayetteville. Billing, outage reporting, and new service connections.", website: "https://www.faypwc.com", featured: true, lat: 35.0420, lng: -78.8750 },
  { id: "c10", name: "Spring Lake Water & Sewer", category: "Utilities", address: "300 Ruth St, Spring Lake, NC 28390", city: "Spring Lake", county: "Cumberland", phone: "(910) 436-0241", description: "Municipal water and sewer service for Spring Lake residents. Billing and service requests.", website: "https://www.spring-lake.org", lat: 35.1730, lng: -78.9720 },
  { id: "c11", name: "Hope Mills Public Utilities", category: "Utilities", address: "5770 Rockfish Rd, Hope Mills, NC 28348", city: "Hope Mills", county: "Cumberland", phone: "(910) 424-4555", description: "Water and sewer services for Hope Mills. Utility billing, meter reading, and water quality reports.", website: "https://www.townofhopemills.com", lat: 35.0100, lng: -78.9500 },
  { id: "c12", name: "Piedmont Natural Gas — Fayetteville", category: "Utilities", address: "Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(800) 752-7504", description: "Natural gas service for Cumberland County residents. New connections, billing, and gas leak reporting.", website: "https://www.piedmontng.com", lat: 35.0500, lng: -78.8900 },

  // ── Transportation ───────────────────────────────────────────────────────
  { id: "c13", name: "FAST (Fayetteville Area System of Transit)", category: "Transportation", address: "505 Franklin St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-1007", description: "Public bus transit serving Fayetteville and Cumberland County. Fixed routes, paratransit, and ride schedules.", website: "https://www.rfrta.com", featured: true, lat: 35.0540, lng: -78.8830 },
  { id: "c14", name: "Cumberland County Community Transportation", category: "Transportation", address: "130 Gillespie St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 678-7624", description: "Demand-response transportation for elderly, disabled, and rural residents of Cumberland County.", lat: 35.0515, lng: -78.8770 },

  // ── Government Offices ───────────────────────────────────────────────────
  { id: "c15", name: "City of Fayetteville — City Hall", category: "Government Offices", address: "433 Hay St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-1990", description: "Municipal government — permits, utility billing, code enforcement, city council, and public information.", website: "https://www.fayettevillenc.gov", featured: true, lat: 35.0530, lng: -78.8800 },
  { id: "c16", name: "Cumberland County Administration", category: "Government Offices", address: "117 Dick St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 321-6500", description: "County offices including tax, register of deeds, elections, planning, and board of commissioners.", website: "https://www.co.cumberland.nc.us", featured: true, lat: 35.0520, lng: -78.8780 },
  { id: "c17", name: "Cumberland County DSS", category: "Government Offices", address: "1225 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 323-1540", description: "Social services — food assistance, Medicaid, child welfare, aging services, and energy assistance.", website: "https://www.co.cumberland.nc.us/dss", lat: 35.0590, lng: -78.8870 },
  { id: "c18", name: "Spring Lake Town Hall", category: "Government Offices", address: "300 Ruth St, Spring Lake, NC 28390", city: "Spring Lake", county: "Cumberland", phone: "(910) 436-0241", description: "Municipal services for Spring Lake — permits, parks, recreation, water billing, and town council.", website: "https://www.spring-lake.org", lat: 35.1730, lng: -78.9720 },
  { id: "c19", name: "Hope Mills Town Hall", category: "Government Offices", address: "5770 Rockfish Rd, Hope Mills, NC 28348", city: "Hope Mills", county: "Cumberland", phone: "(910) 424-4555", description: "Municipal government — permits, utilities, parks programming, and community events.", website: "https://www.townofhopemills.com", lat: 35.0100, lng: -78.9500 },

  // ── Courts & Legal ───────────────────────────────────────────────────────
  { id: "c20", name: "Cumberland County Courthouse", category: "Courts & Legal", address: "117 Dick St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 475-3000", description: "County courthouse — civil and criminal court, traffic court, family court, and legal filings.", website: "https://www.nccourts.gov/locations/cumberland-county", lat: 35.0520, lng: -78.8780 },
  { id: "c21", name: "Cumberland County Register of Deeds", category: "Courts & Legal", address: "117 Dick St, Room 114, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 321-6710", description: "Public records — property deeds, marriage licenses, birth and death certificates, military discharges.", website: "https://www.co.cumberland.nc.us/departments/register-of-deeds", lat: 35.0520, lng: -78.8780 },

  // ── Health Services ──────────────────────────────────────────────────────
  { id: "c22", name: "Cumberland County Health Department", category: "Health Services", address: "1235 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-3600", description: "Public health — immunizations, WIC, family planning, STD testing, environmental health, and wellness clinics.", website: "https://co.cumberland.nc.us/health", featured: true, lat: 35.0593, lng: -78.8865 },
  { id: "c23", name: "VA Medical Center — Fayetteville", category: "Health Services", address: "2300 Ramsey St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 488-2120", description: "Veterans Affairs healthcare — medical, mental health, pharmacy, and specialty care for veterans and families.", website: "https://www.va.gov/fayetteville-nc-health-care", featured: true, lat: 35.0650, lng: -78.8900 },

  // ── Libraries & Education ────────────────────────────────────────────────
  { id: "c24", name: "Cumberland County Public Library", category: "Libraries & Education", address: "300 Maiden Ln, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 483-7727", description: "9-branch library system with free internet access, children's programs, and community meeting rooms.", website: "https://www.cumberland.lib.nc.us", lat: 35.0550, lng: -78.8830 },
  { id: "c25", name: "Cumberland County Schools", category: "Libraries & Education", address: "2465 Gillespie St, Fayetteville, NC 28306", city: "Fayetteville", county: "Cumberland", phone: "(910) 678-2300", description: "Public school district with 85+ schools serving 50,000+ students in Cumberland County.", website: "https://www.ccs.k12.nc.us", lat: 35.0380, lng: -78.8950 },

  // ── Parks & Recreation ───────────────────────────────────────────────────
  { id: "c26", name: "Fayetteville Parks & Recreation", category: "Parks & Recreation", address: "433 Hay St, Fayetteville, NC 28301", city: "Fayetteville", county: "Cumberland", phone: "(910) 433-1547", description: "City parks, trails, recreation centers, sports leagues, and community programs.", website: "https://www.fayettevillenc.gov/parks", lat: 35.0530, lng: -78.8800 },

  // ── Military ─────────────────────────────────────────────────────────────
  { id: "c27", name: "Fort Liberty (Fort Bragg) — Main Gate", category: "Military", address: "Reilly Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-0011", description: "U.S. Army installation — home of the XVIII Airborne Corps, Special Operations, and 82nd Airborne Division.", website: "https://home.army.mil/liberty", featured: true, lat: 35.1408, lng: -79.0064 },
  { id: "c28", name: "Fort Liberty Military Police", category: "Military", address: "Reilly Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-0391", description: "On-post law enforcement and security. Non-emergency dispatch for Fort Liberty installation.", lat: 35.1400, lng: -79.0050 },
  { id: "c29", name: "Womack Army Medical Center", category: "Military", address: "2817 Reilly Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 907-6000", description: "Military hospital providing medical care for active duty, retirees, and dependents at Fort Liberty.", website: "https://womack.tricare.mil", featured: true, lat: 35.1390, lng: -79.0030 },
  { id: "c30", name: "Fort Liberty Fire & Emergency Services", category: "Military", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-0011", description: "On-post fire protection, emergency medical services, and hazmat response for Fort Liberty.", lat: 35.1420, lng: -79.0080 },

  // ── Fort Liberty — DEERS, Housing, SRP & Installation Services ─────────
  { id: "fl01", name: "DEERS / ID Card Center (RAPIDS)", category: "Military", address: "2843 Desert Storm Dr, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-5227", description: "Defense Enrollment Eligibility Reporting System — CAC cards, military IDs, dependent enrollment, and TRICARE eligibility updates.", website: "https://home.army.mil/liberty/about/dir-human-resources/military-personnel-division/id-cards-deers", featured: true, lat: 35.1395, lng: -79.0045 },
  { id: "fl02", name: "Fort Liberty Visitor Center & Access Control", category: "Military", address: "All American Expy, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-5401", description: "Installation access for visitors — day passes, vehicle registration, and base access requirements.", lat: 35.1380, lng: -78.9950 },
  { id: "fl03", name: "Fort Liberty Housing Office (DPW)", category: "Government Offices", address: "Building 3-1333, Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-1680", description: "On-post housing assignments, privatized housing (Corvias), barracks management, and housing referral for off-post rentals.", website: "https://www.fortlibertyhousing.com", lat: 35.1410, lng: -79.0020 },
  { id: "fl04", name: "Soldier Readiness Processing (SRP) Center", category: "Military", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-0011", description: "One-stop processing for deployments and PCS moves — medical, dental, legal, finance, and personnel readiness.", lat: 35.1425, lng: -79.0070 },
  { id: "fl05", name: "Central Issue Facility (CIF)", category: "Military", address: "Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-8604", description: "Organizational equipment issue and turn-in — body armor, tactical gear, field equipment for inprocessing and outprocessing soldiers.", lat: 35.1430, lng: -79.0055 },

  // ── Fort Liberty — Health & Dental ─────────────────────────────────────
  { id: "fl06", name: "Womack Army Medical Center — Pharmacy", category: "Health Services", address: "2817 Reilly Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 907-6795", description: "On-post pharmacy services for active duty, retirees, and dependents. Prescription refills and over-the-counter medications.", website: "https://womack.tricare.mil/Health-Services/Pharmacy", lat: 35.1388, lng: -79.0028 },
  { id: "fl07", name: "Womack — Behavioral Health (SUDCC)", category: "Health Services", address: "2817 Reilly Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 907-8046", description: "Behavioral health and substance use disorder clinical care. Counseling, therapy, crisis intervention, and substance abuse treatment.", lat: 35.1392, lng: -79.0032 },
  { id: "fl08", name: "Fort Liberty Dental Clinics", category: "Health Services", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 907-6100", description: "Military dental clinics providing dental readiness exams, cleanings, fillings, and specialty dental care for active duty soldiers.", lat: 35.1385, lng: -79.0040 },

  // ── Fort Liberty — Support Services (ACS, Finance, Legal, Education) ───
  { id: "fl09", name: "Army Community Service (ACS)", category: "Government Offices", address: "2601 Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-8681", description: "Relocation assistance, financial readiness, family advocacy, employment programs, and exceptional family member program (EFMP).", website: "https://home.army.mil/liberty/about/dir-family-morale-welfare-recreation/army-community-service", featured: true, lat: 35.1415, lng: -79.0010 },
  { id: "fl10", name: "Finance Office (DFAS)", category: "Government Offices", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-5238", description: "Defense Finance and Accounting — military pay, travel vouchers, in/out-processing pay actions, and LES inquiries.", lat: 35.1405, lng: -79.0060 },
  { id: "fl11", name: "Transportation Office (PCS / Household Goods)", category: "Government Offices", address: "Building C-1327, Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-2598", description: "PCS move coordination — household goods shipping, vehicle transport, temporary storage, and personally procured moves (PPM/DITY).", lat: 35.1402, lng: -79.0025 },
  { id: "fl12", name: "Legal Assistance Office (JAG)", category: "Courts & Legal", address: "Building E-2218, Ardennes St, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-0396", description: "Free legal assistance for soldiers and families — wills, powers of attorney, tax preparation, landlord-tenant issues, and consumer law.", website: "https://home.army.mil/liberty/about/dir-staff-judge-advocate/legal-assistance", featured: true, lat: 35.1398, lng: -79.0042 },
  { id: "fl13", name: "Education Center", category: "Libraries & Education", address: "Building D-1701, Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-1722", description: "Tuition assistance, college enrollment, GI Bill counseling, CLEP/DSST testing, credentialing programs, and degree completion.", website: "https://home.army.mil/liberty/about/dir-human-resources/education-center", featured: true, lat: 35.1412, lng: -79.0015 },
  { id: "fl14", name: "Soldier For Life — Transition Assistance (SFL-TAP)", category: "Veteran Services", address: "Building H-1122, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-4663", description: "Career transition services — resume workshops, job fairs, VA benefits briefings, skills translation, and career counseling for separating soldiers.", website: "https://home.army.mil/liberty/about/dir-human-resources/sfl-tap", featured: true, lat: 35.1408, lng: -79.0050 },
  { id: "fl15", name: "Chaplain / Religious Support Office", category: "Government Offices", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-9010", description: "Chaplain services — worship services, marriage and family counseling, spiritual fitness, and crisis support for soldiers and families of all faiths.", lat: 35.1418, lng: -79.0035 },

  // ── Fort Liberty — MWR, Commissary, PX ─────────────────────────────────
  { id: "fl16", name: "MWR (Morale, Welfare & Recreation)", category: "Parks & Recreation", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-4445", description: "Gyms, fitness centers, pools, bowling center, outdoor recreation, auto craft shop, arts & crafts, and community events.", website: "https://liberty.armymwr.com", featured: true, lat: 35.1435, lng: -79.0060 },
  { id: "fl17", name: "Fort Liberty Commissary (DeCA)", category: "Government Offices", address: "6890 Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 907-2222", description: "Military grocery store — tax-free groceries, household supplies, and fresh produce for active duty, retirees, and dependents.", website: "https://www.commissaries.com/shopping/store-locations/fort-liberty", featured: true, lat: 35.1440, lng: -79.0045 },
  { id: "fl18", name: "Main Exchange (PX / AAFES)", category: "Government Offices", address: "Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 436-1884", description: "Army & Air Force Exchange Service — tax-free shopping for electronics, clothing, auto care, food court, barber, and optical.", website: "https://www.shopmyexchange.com", lat: 35.1432, lng: -79.0040 },

  // ── Fort Liberty — Library & Warrior Transition ─────────────────────────
  { id: "fl19", name: "Fort Liberty Library (Throckmorton)", category: "Libraries & Education", address: "Building C-7321, Gruber Rd, Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 396-4649", description: "On-post library with free internet, children's programs, reading rooms, digital resources, and study spaces for soldiers and families.", lat: 35.1422, lng: -79.0030 },
  { id: "fl20", name: "Warrior Transition Battalion", category: "Veteran Services", address: "Fort Liberty, NC 28310", city: "Fort Liberty", county: "Cumberland", phone: "(910) 907-7927", description: "Comprehensive care and support for wounded, ill, and injured soldiers during recovery and transition back to duty or civilian life.", lat: 35.1395, lng: -79.0038 },

  // ════════════════════════════════════════════════════════════════════════════
  // SAMPSON COUNTY — Clinton, Roseboro, Newton Grove, Garland
  // ════════════════════════════════════════════════════════════════════════════

  // ── Police & Sheriff ─────────────────────────────────────────────────────
  { id: "sp01", name: "Clinton Police Department", category: "Police & Sheriff", address: "222 Lisbon St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-3105", description: "Municipal police for the City of Clinton — patrol, criminal investigations, and community programs.", website: "https://www.cityofclintonnc.com/184/Police", lat: 35.0128, lng: -78.3233 },
  { id: "sp02", name: "Sampson County Sheriff's Office", category: "Police & Sheriff", address: "112 Fontana St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-4141", description: "County-wide law enforcement, detention center, and civil process for all of Sampson County.", website: "https://www.sampsonsheriff.com", featured: true, lat: 35.0100, lng: -78.3250 },

  // ── Fire & EMS ───────────────────────────────────────────────────────────
  { id: "sp03", name: "Clinton Fire Department", category: "Fire & EMS", address: "222 Wall St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 299-4902", description: "City fire department providing fire suppression, rescue, and first responder emergency services.", website: "https://www.cityofclintonnc.com/168/Fire", lat: 35.0120, lng: -78.3240 },
  { id: "sp04", name: "Sampson County Emergency Services", category: "Fire & EMS", address: "530 Commerce St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-8996", description: "County EMS, 911 dispatch, emergency management, and fire marshal for Sampson County.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Emergency-Services", lat: 35.0100, lng: -78.3200 },

  // ── Hospitals ──────────────────────────────────────────────────────────
  { id: "sp05", name: "Sampson Regional Medical Center", category: "Hospitals", address: "607 Beaman St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-8511", description: "Full-service community hospital with 24/7 emergency department, surgery, imaging, rehab, and specialty care serving Sampson County.", website: "https://www.sampsonrmc.org", featured: true, lat: 35.0078, lng: -78.3236 },

  // ── Health Services ────────────────────────────────────────────────────
  { id: "sp06", name: "Sampson County Health Department", category: "Health Services", address: "360 County Complex Rd, Bldg E, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-1131", description: "Public health — immunizations, WIC, family planning, communicable disease testing, environmental health, and wellness clinics.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Health-Department", featured: true, lat: 35.0045, lng: -78.3400 },

  // ── Senior & Social Services ───────────────────────────────────────────
  { id: "sp07", name: "Sampson County Dept. of Social Services", category: "Senior & Social Services", address: "360 County Complex Rd, Suite 100, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-7131", description: "Social services — food assistance (SNAP), Medicaid, child welfare, foster care, energy assistance, and family support programs.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Social-Services", featured: true, lat: 35.0047, lng: -78.3402 },
  { id: "sp08", name: "Sampson County Department of Aging", category: "Senior & Social Services", address: "406 County Complex Rd, Suite 120, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-4653", description: "Senior services — home-delivered meals, adult day care, transportation assistance, caregiver support, and senior center programming.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Aging-Services", lat: 35.0043, lng: -78.3398 },

  // ── Waste Management ───────────────────────────────────────────────────
  { id: "sp09", name: "Sampson County Solid Waste & Landfill", category: "Waste Management", address: "7434 Roseboro Hwy, Roseboro, NC 28382", city: "Roseboro", county: "Sampson", phone: "(910) 525-4132", description: "County landfill and solid waste disposal operated by GFL Environmental. Convenience sites across the county for residential drop-off.", website: "https://gflenv.com/sampson-county-landfill/", featured: true, lat: 34.9500, lng: -78.5100 },
  { id: "sp10", name: "City of Clinton Sanitation Services", category: "Waste Management", address: "221 Lisbon St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 299-4909", description: "Municipal trash pickup and curbside recycling for Clinton city residents. Weekly collection schedule and bulk item pickup.", website: "https://www.cityofclintonnc.com", lat: 35.0128, lng: -78.3233 },

  // ── Animal Services ────────────────────────────────────────────────────
  { id: "sp11", name: "Sampson County Animal Shelter", category: "Animal Services", address: "168 Agriculture Pl, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-8493", description: "County animal shelter — stray intake, adoptions, animal control, and lost pet recovery for all of Sampson County.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Animal-Shelter", featured: true, lat: 34.9850, lng: -78.3200 },

  // ── Agriculture ────────────────────────────────────────────────────────
  { id: "sp12", name: "N.C. Cooperative Extension — Sampson County", category: "Agriculture", address: "55 Agriculture Pl, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-7161", description: "NC State University agricultural extension — farming education, 4-H youth programs, livestock resources, and crop management assistance.", website: "https://sampson.ces.ncsu.edu/", featured: true, lat: 34.9855, lng: -78.3205 },
  { id: "sp13", name: "USDA Farm Service Agency — Sampson County", category: "Agriculture", address: "80 County Complex Rd, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-4791", description: "Federal farm programs — crop insurance, conservation programs, farm loans, and disaster assistance for Sampson County farmers.", lat: 35.0048, lng: -78.3405 },
  { id: "sp14", name: "Sampson County Agri-Exposition Center", category: "Agriculture", address: "414 Warsaw Rd, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-6451", description: "Agricultural exposition and event facility hosting livestock shows, farm equipment expos, 4-H events, and community gatherings.", website: "https://www.sampsonexpocenter.com", lat: 35.0150, lng: -78.2900 },

  // ── Veteran Services ───────────────────────────────────────────────────
  { id: "sp15", name: "Sampson County Veterans Service Office", category: "Veteran Services", address: "335 County Complex Rd, Suite 100, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-2862", description: "Veterans benefits assistance — VA claims, disability compensation, pension, healthcare enrollment, and burial benefits for Sampson County veterans.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Veterans-Office", featured: true, lat: 35.0046, lng: -78.3401 },

  // ── Government Offices ─────────────────────────────────────────────────
  { id: "sp16", name: "Sampson County Administration", category: "Government Offices", address: "435 Rowan Rd, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-6308", description: "County government — county manager, board of commissioners, planning, permitting, tax administration, and public records.", website: "https://www.sampsoncountync.gov", featured: true, lat: 35.0045, lng: -78.3400 },
  { id: "sp17", name: "City of Clinton — City Hall", category: "Government Offices", address: "221 Lisbon St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 299-4900", description: "Municipal government — permits, utility billing, code enforcement, city council, and public services.", website: "https://www.cityofclintonnc.com", lat: 35.0128, lng: -78.3233 },
  { id: "sp18", name: "Sampson County Board of Elections", category: "Government Offices", address: "120 County Complex Rd, Suite 110, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-5796", description: "Voter registration, early voting, election day polling locations, absentee ballots, and election results.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Board-of-Elections", lat: 35.0044, lng: -78.3399 },
  { id: "sp19", name: "Sampson County Register of Deeds", category: "Government Offices", address: "126-A W Elizabeth St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-8026", description: "Public records — property deeds, marriage licenses, birth and death certificates, military discharge records.", website: "https://www.sampsonrod.org", lat: 35.0120, lng: -78.3230 },

  // ── Courts & Legal ─────────────────────────────────────────────────────
  { id: "sp20", name: "Sampson County Courthouse", category: "Courts & Legal", address: "101 E Main St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 596-6600", description: "District and superior court — civil and criminal proceedings, clerk of court, district attorney, and family court.", website: "https://www.nccourts.gov/locations/sampson-county", lat: 35.0130, lng: -78.3220 },

  // ── Utilities ──────────────────────────────────────────────────────────
  { id: "sp21", name: "City of Clinton Public Works & Utilities", category: "Utilities", address: "200 John St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 299-4905", description: "Municipal water, sewer, and trash services for Clinton city limits. New connections, billing, and emergency repairs.", website: "https://www.cityofclintonnc.com/1364/Utility-Billing", lat: 35.0100, lng: -78.3200 },
  { id: "sp22", name: "Sampson County Public Works (County Water)", category: "Utilities", address: "827 Southeast Blvd, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-0188", description: "County water system for rural Sampson County. Water connections, billing, and after-hours emergency line.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Public-Works", lat: 34.9950, lng: -78.3100 },

  // ── Transportation ─────────────────────────────────────────────────────
  { id: "sp23", name: "Sampson Area Transportation (SAT)", category: "Transportation", address: "311 County Complex Rd, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 299-0127", description: "Public transit for Sampson County — demand-response rides, medical transport, and senior/veteran reduced fares.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Public-Transportation", lat: 35.0045, lng: -78.3400 },

  // ── Libraries & Education ──────────────────────────────────────────────
  { id: "sp24", name: "Sampson-Clinton Public Library", category: "Libraries & Education", address: "217 Graham St, Clinton, NC 28328", city: "Clinton", county: "Sampson", phone: "(910) 592-4153", description: "Main branch of Sampson County library system with 92,000+ volumes, computer access, children's programs, and branches in Garland, Newton Grove, and Roseboro.", website: "https://www.sampsoncountync.gov/Government/Departments-A-Z/Library", lat: 35.0140, lng: -78.3230 },

  // ════════════════════════════════════════════════════════════════════════════
  // BLADEN COUNTY — Elizabethtown, Bladenboro, Clarkton
  // ════════════════════════════════════════════════════════════════════════════
  { id: "b01", name: "Elizabethtown Police Department", category: "Police & Sheriff", address: "410 W Broad St, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-3125", description: "Municipal police for Elizabethtown — patrol, investigations, and community safety.", lat: 34.6295, lng: -78.6065 },
  { id: "b02", name: "Bladen County Sheriff's Office", category: "Police & Sheriff", address: "299 Smith Circle, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6960", description: "County-wide law enforcement, detention, and civil process for Bladen County.", website: "https://www.bladenso.com", lat: 34.6310, lng: -78.6090 },
  { id: "b03", name: "Bladen County EMS & Fire Marshal", category: "Fire & EMS", address: "Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6752", description: "County emergency medical services and fire inspection for all Bladen County communities.", lat: 34.6300, lng: -78.6050 },
  { id: "b04", name: "Bladen County Government", category: "Government Offices", address: "106 E Broad St, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6700", description: "County offices — tax, planning, elections, social services, and board of commissioners.", website: "https://www.bladenco.org", featured: true, lat: 34.6295, lng: -78.6050 },
  { id: "b05", name: "Bladen County Health Department", category: "Health Services", address: "300 Mercer Mill Rd, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6900", description: "Public health — vaccinations, family planning, dental services, and environmental health.", lat: 34.6310, lng: -78.6080 },
  { id: "b06", name: "Bladen County Public Library", category: "Libraries & Education", address: "111 N Cypress St, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6990", description: "Public library with computer access, children's programs, and community meeting space.", lat: 34.6290, lng: -78.6040 },
  { id: "b07", name: "Bladen County Water & Sewer", category: "Utilities", address: "106 E Broad St, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-6700", description: "County water and sewer services — billing, connections, and infrastructure maintenance.", lat: 34.6295, lng: -78.6050 },
  { id: "b08", name: "Bladen County Transportation (BARTS)", category: "Transportation", address: "200 Smith Circle, Elizabethtown, NC 28337", city: "Elizabethtown", county: "Bladen", phone: "(910) 862-3008", description: "Rural public transportation for Bladen County residents. Demand-response and scheduled routes.", lat: 34.6305, lng: -78.6085 },

  // ════════════════════════════════════════════════════════════════════════════
  // HOKE COUNTY — Raeford
  // ════════════════════════════════════════════════════════════════════════════
  { id: "h01", name: "Raeford Police Department", category: "Police & Sheriff", address: "323 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-4251", description: "Municipal police for the City of Raeford — patrol, community policing, and investigations.", lat: 35.0020, lng: -79.2250 },
  { id: "h02", name: "Hoke County Sheriff's Office", category: "Police & Sheriff", address: "327 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-5111", description: "County law enforcement, detention center, and civil process for Hoke County.", website: "https://www.hokecounty.net/sheriff", lat: 35.0025, lng: -79.2245 },
  { id: "h03", name: "Hoke County Fire Marshal", category: "Fire & EMS", address: "227 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-8751", description: "Fire inspections, emergency management, and volunteer fire department coordination.", lat: 35.0015, lng: -79.2245 },
  { id: "h04", name: "Hoke County Government Center", category: "Government Offices", address: "227 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-8751", description: "County offices — tax, permitting, register of deeds, elections, and commissioners meetings.", website: "https://www.hokecounty.net", featured: true, lat: 35.0015, lng: -79.2245 },
  { id: "h05", name: "Hoke County Health Department", category: "Health Services", address: "683 E Palmer St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-3717", description: "Public health — immunizations, prenatal care, WIC, communicable disease testing, and wellness.", lat: 35.0025, lng: -79.2180 },
  { id: "h06", name: "Hoke County Public Library", category: "Libraries & Education", address: "334 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-2502", description: "Public library with book lending, computer access, children's programs, and meeting rooms.", lat: 35.0020, lng: -79.2250 },
  { id: "h07", name: "Hoke County Public Utilities", category: "Utilities", address: "227 N Main St, Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-8751", description: "County water and sewer services for Hoke County. Billing, new connections, and water quality.", lat: 35.0015, lng: -79.2245 },
  { id: "h08", name: "Hoke County Transportation", category: "Transportation", address: "Raeford, NC 28376", city: "Raeford", county: "Hoke", phone: "(910) 875-8751", description: "Rural public transit and demand-response transportation services for Hoke County residents.", lat: 35.0010, lng: -79.2240 },

  // ════════════════════════════════════════════════════════════════════════════
  // LEE COUNTY — Sanford
  // ════════════════════════════════════════════════════════════════════════════
  { id: "l01", name: "Sanford Police Department", category: "Police & Sheriff", address: "134 S Horner Blvd, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 775-8268", description: "Municipal police for the City of Sanford — patrol, criminal investigations, and community programs.", website: "https://www.sanfordnc.net/police", lat: 35.4780, lng: -79.1800 },
  { id: "l02", name: "Lee County Sheriff's Office", category: "Police & Sheriff", address: "1401 S Horner Blvd, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 718-4560", description: "County law enforcement, detention, and civil process for Lee County and unincorporated areas.", website: "https://www.leecountync.gov/sheriff", lat: 35.4650, lng: -79.1810 },
  { id: "l03", name: "Sanford Fire Department", category: "Fire & EMS", address: "225 E Weatherspoon St, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 775-8241", description: "City fire department providing fire suppression, rescue, and first responder services.", lat: 35.4800, lng: -79.1790 },
  { id: "l04", name: "Lee County EMS", category: "Fire & EMS", address: "Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 718-4680", description: "County emergency medical services providing advanced life support and medical transport.", lat: 35.4790, lng: -79.1800 },
  { id: "l05", name: "City of Sanford — City Hall", category: "Government Offices", address: "225 E Weatherspoon St, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 775-8207", description: "Municipal government — permits, zoning, utility billing, planning, and city council meetings.", website: "https://www.sanfordnc.net", featured: true, lat: 35.4800, lng: -79.1790 },
  { id: "l06", name: "Lee County Government", category: "Government Offices", address: "106 Hillcrest Dr, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 718-4600", description: "County offices — tax, register of deeds, elections, planning, and board of commissioners.", website: "https://www.leecountync.gov", lat: 35.4820, lng: -79.1820 },
  { id: "l07", name: "Lee County Utilities (Water & Sewer)", category: "Utilities", address: "225 E Weatherspoon St, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 718-4630", description: "Water and sewer for Sanford and Lee County. Billing, outage reporting, and new service.", lat: 35.4800, lng: -79.1790 },
  { id: "l08", name: "Lee County Transit (LCTA)", category: "Transportation", address: "Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 842-5115", description: "Public transportation for Lee County residents. Demand-response and community routes.", lat: 35.4780, lng: -79.1810 },
  { id: "l09", name: "Lee County Health Department", category: "Health Services", address: "106 Hillcrest Dr, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 718-4640", description: "Public health — immunizations, WIC, family planning, communicable disease testing, and wellness.", lat: 35.4820, lng: -79.1820 },
  { id: "l10", name: "Lee County Courthouse", category: "Courts & Legal", address: "1408 S Horner Blvd, Sanford, NC 27330", city: "Sanford", county: "Lee", phone: "(919) 718-4500", description: "District and superior court — civil, criminal, family court, traffic, and small claims.", lat: 35.4645, lng: -79.1815 },

  // ════════════════════════════════════════════════════════════════════════════
  // SCOTLAND COUNTY — Laurinburg
  // ════════════════════════════════════════════════════════════════════════════
  { id: "s01", name: "Laurinburg Police Department", category: "Police & Sheriff", address: "303 W Church St, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 276-3211", description: "Municipal police for Laurinburg — patrol, investigations, community policing, and traffic enforcement.", lat: 34.7740, lng: -79.4680 },
  { id: "s02", name: "Scotland County Sheriff's Office", category: "Police & Sheriff", address: "212 Biggs St, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 276-3385", description: "County law enforcement, detention center, and civil process for Scotland County.", lat: 34.7720, lng: -79.4660 },
  { id: "s03", name: "Laurinburg Fire Department", category: "Fire & EMS", address: "600 Atkinson St, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 276-0769", description: "Municipal fire department providing fire suppression, rescue, and emergency response.", lat: 34.7750, lng: -79.4670 },
  { id: "s04", name: "Scotland County Government", category: "Government Offices", address: "231 E Cronly St, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 277-2406", description: "County offices — tax, planning, register of deeds, social services, and commissioners meetings.", website: "https://www.scotlandcounty.org", featured: true, lat: 34.7735, lng: -79.4650 },
  { id: "s05", name: "Scotland County Health Department", category: "Health Services", address: "1405 West Blvd, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 277-2440", description: "Public health — immunizations, WIC, family planning, dental, and communicable disease prevention.", lat: 34.7760, lng: -79.4740 },
  { id: "s06", name: "Scotland County Courthouse", category: "Courts & Legal", address: "212 Biggs St, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 277-2500", description: "District and superior court for Scotland County — civil, criminal, and family proceedings.", lat: 34.7720, lng: -79.4660 },
  { id: "s07", name: "Scotland County Public Utilities", category: "Utilities", address: "231 E Cronly St, Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 277-2585", description: "County water and sewer services. Billing, new connections, and water quality information.", lat: 34.7735, lng: -79.4650 },
  { id: "s08", name: "Scotland County Area Transit (SCAT)", category: "Transportation", address: "Laurinburg, NC 28352", city: "Laurinburg", county: "Scotland", phone: "(910) 277-2590", description: "Rural public transit serving Scotland County. Demand-response and medical transport.", lat: 34.7740, lng: -79.4680 },

  // ════════════════════════════════════════════════════════════════════════════
  // MOORE COUNTY — Southern Pines, Aberdeen, Pinehurst, Carthage
  // ════════════════════════════════════════════════════════════════════════════
  { id: "m01", name: "Southern Pines Police Department", category: "Police & Sheriff", address: "450 W Pennsylvania Ave, Southern Pines, NC 28387", city: "Southern Pines", county: "Moore", phone: "(910) 692-7031", description: "Municipal police for Southern Pines — patrol, criminal investigations, and community relations.", website: "https://www.southernpines.net/police", lat: 35.1740, lng: -79.3950 },
  { id: "m02", name: "Moore County Sheriff's Office", category: "Police & Sheriff", address: "105 Dowd Rd, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-2931", description: "County law enforcement and detention for all of Moore County.", website: "https://www.moorecountync.gov/sheriff", lat: 35.3450, lng: -79.4180 },
  { id: "m03", name: "Aberdeen Police Department", category: "Police & Sheriff", address: "113 N Poplar St, Aberdeen, NC 28315", city: "Aberdeen", county: "Moore", phone: "(910) 944-7877", description: "Municipal police for Aberdeen — patrol, investigations, and traffic enforcement.", lat: 35.1320, lng: -79.4290 },
  { id: "m04", name: "Southern Pines Fire & Rescue", category: "Fire & EMS", address: "Southern Pines, NC 28387", city: "Southern Pines", county: "Moore", phone: "(910) 692-2606", description: "Fire protection and rescue services for the Town of Southern Pines and surrounding areas.", lat: 35.1750, lng: -79.3960 },
  { id: "m05", name: "Moore County Government Center", category: "Government Offices", address: "1 Courthouse Square, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-6363", description: "County offices — tax, permits, register of deeds, planning, and county commissioners.", website: "https://www.moorecountync.gov", featured: true, lat: 35.3447, lng: -79.4170 },
  { id: "m06", name: "Moore County Health Department", category: "Health Services", address: "705 Pinehurst Ave, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-3300", description: "Public health including clinical care, WIC, environmental health, and emergency preparedness.", lat: 35.3430, lng: -79.4160 },
  { id: "m07", name: "Moore County Public Utilities", category: "Utilities", address: "1 Courthouse Square, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-6363", description: "Water and sewer services for unincorporated Moore County. Billing and new connections.", lat: 35.3447, lng: -79.4170 },
  { id: "m08", name: "Moore County Transportation", category: "Transportation", address: "Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-7017", description: "Demand-response public transit for Moore County residents. Medical and general purpose trips.", lat: 35.3440, lng: -79.4175 },
  { id: "m09", name: "Moore County Library", category: "Libraries & Education", address: "101 Saunders St, Carthage, NC 28327", city: "Carthage", county: "Moore", phone: "(910) 947-5335", description: "County library system with multiple branches — book lending, internet, and community programs.", lat: 35.3445, lng: -79.4160 },

  // ════════════════════════════════════════════════════════════════════════════
  // ROBESON COUNTY — Lumberton, Pembroke, St. Pauls
  // ════════════════════════════════════════════════════════════════════════════
  { id: "r01", name: "Lumberton Police Department", category: "Police & Sheriff", address: "321 N Elm St, Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 671-3840", description: "Municipal police for Lumberton — patrol, investigations, community policing, and crime prevention.", lat: 34.6182, lng: -79.0070 },
  { id: "r02", name: "Robeson County Sheriff's Office", category: "Police & Sheriff", address: "100 Legend Rd, Lumberton, NC 28360", city: "Lumberton", county: "Robeson", phone: "(910) 671-3170", description: "Largest county law enforcement in NC by area — patrol, detention, civil process, and investigations.", website: "https://www.robesoncoso.org", lat: 34.6200, lng: -79.0120 },
  { id: "r03", name: "Pembroke Police Department", category: "Police & Sheriff", address: "100 Union Chapel Rd, Pembroke, NC 28372", city: "Pembroke", county: "Robeson", phone: "(910) 521-4333", description: "Municipal police for Pembroke — patrol and community safety near UNC Pembroke campus.", lat: 34.6815, lng: -79.1900 },
  { id: "r04", name: "Lumberton Fire Department", category: "Fire & EMS", address: "400 N Chestnut St, Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 671-3860", description: "Municipal fire and rescue for the City of Lumberton.", lat: 34.6190, lng: -79.0080 },
  { id: "r05", name: "Robeson County Courthouse", category: "Courts & Legal", address: "500 N Elm St, Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 671-3000", description: "County courthouse — civil and criminal proceedings, register of deeds, and commissioners.", website: "https://www.co.robeson.nc.us", featured: true, lat: 34.6182, lng: -79.0066 },
  { id: "r06", name: "Robeson County Health Department", category: "Health Services", address: "460 Country Club Rd, Lumberton, NC 28360", city: "Lumberton", county: "Robeson", phone: "(910) 671-3200", description: "Public health — immunizations, dental care, prenatal services, and health education.", lat: 34.6280, lng: -79.0200 },
  { id: "r07", name: "Town of St. Pauls", category: "Government Offices", address: "207 W Blue St, St. Pauls, NC 28384", city: "St. Pauls", county: "Robeson", phone: "(910) 865-4178", description: "Municipal government — water and sewer billing, code enforcement, and community programs.", lat: 34.8060, lng: -78.9710 },
  { id: "r08", name: "Robeson County Public Utilities", category: "Utilities", address: "550 N Chestnut St, Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 671-3048", description: "County water and sewer service for unincorporated areas. Billing and connections.", lat: 34.6195, lng: -79.0085 },
  { id: "r09", name: "Robeson County Transit (RCTA)", category: "Transportation", address: "Lumberton, NC 28358", city: "Lumberton", county: "Robeson", phone: "(910) 618-5685", description: "Public transit serving Robeson County with demand-response and fixed community routes.", lat: 34.6185, lng: -79.0075 },

  // ════════════════════════════════════════════════════════════════════════════
  // HARNETT COUNTY — Lillington, Dunn, Erwin
  // ════════════════════════════════════════════════════════════════════════════
  { id: "n01", name: "Harnett County Sheriff's Office", category: "Police & Sheriff", address: "175 Bain St, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-9111", description: "County law enforcement, detention, and civil process for all of Harnett County.", website: "https://www.harnett.org/sheriff", lat: 35.3950, lng: -78.8100 },
  { id: "n02", name: "Lillington Police Department", category: "Police & Sheriff", address: "100 S Front St, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-3015", description: "Municipal police for Lillington — patrol, investigations, and community engagement.", lat: 35.3960, lng: -78.8120 },
  { id: "n03", name: "Dunn Police Department", category: "Police & Sheriff", address: "207 W Cumberland St, Dunn, NC 28334", city: "Dunn", county: "Harnett", phone: "(910) 892-2399", description: "Municipal police for the City of Dunn — patrol, criminal investigations, and traffic enforcement.", lat: 35.3060, lng: -78.6080 },
  { id: "n04", name: "Harnett County Emergency Services", category: "Fire & EMS", address: "305 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-7580", description: "County EMS, 911 dispatch, emergency management, and fire marshal for Harnett County.", lat: 35.3960, lng: -78.8110 },
  { id: "n05", name: "Dunn Fire Department", category: "Fire & EMS", address: "201 S Clinton Ave, Dunn, NC 28334", city: "Dunn", county: "Harnett", phone: "(910) 892-2632", description: "Municipal fire protection and emergency response for the City of Dunn.", lat: 35.3065, lng: -78.6075 },
  { id: "n06", name: "Harnett County Government Complex", category: "Government Offices", address: "305 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-7555", description: "County offices — tax, permits, social services, register of deeds, and commissioners.", website: "https://www.harnett.org", featured: true, lat: 35.3960, lng: -78.8110 },
  { id: "n07", name: "City of Dunn — City Hall", category: "Government Offices", address: "401 E Broad St, Dunn, NC 28334", city: "Dunn", county: "Harnett", phone: "(910) 892-2016", description: "Municipal government for Dunn — permits, utility billing, zoning, and city council.", website: "https://www.dunn-nc.org", lat: 35.3070, lng: -78.6050 },
  { id: "n08", name: "Harnett County Health Department", category: "Health Services", address: "307 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-7550", description: "Public health — immunizations, WIC, family planning, dental, and health education.", lat: 35.3965, lng: -78.8115 },
  { id: "n09", name: "Harnett County Public Utilities", category: "Utilities", address: "305 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-7555", description: "County water and sewer services, billing, new connections, and water quality reporting.", lat: 35.3960, lng: -78.8110 },
  { id: "n10", name: "Harnett Area Rural Transit (HART)", category: "Transportation", address: "250 Alexander Dr, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 814-4019", description: "Public transit for Harnett County — fixed routes, demand-response, and medical transport.", website: "https://www.harnett.org/hart", lat: 35.3955, lng: -78.8105 },
  { id: "n11", name: "Harnett County Public Library", category: "Libraries & Education", address: "601 S Main St, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-3446", description: "County library system with branches in Lillington, Dunn, Erwin, Coats, and Angier.", website: "https://www.harnett.org/library", lat: 35.3940, lng: -78.8100 },
  { id: "n12", name: "Harnett County Courthouse", category: "Courts & Legal", address: "301 W Cornelius Harnett Blvd, Lillington, NC 27546", city: "Lillington", county: "Harnett", phone: "(910) 893-3000", description: "District and superior courts — civil, criminal, family, traffic, and small claims for Harnett County.", lat: 35.3960, lng: -78.8115 },
];

const MAP_CENTER: [number, number] = [35.0527, -78.9236];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommunityServicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [activeArea, setActiveArea] = useState<string>("All");
  const [selectedListing, setSelectedListing] = useState<ServiceListing | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── API-backed directory data (falls back to hardcoded SERVICE_LISTINGS) ──
  const [listings, setListings] = useState<ServiceListing[]>(SERVICE_LISTINGS);

  useEffect(() => {
    let cancelled = false;
    async function fetchListings() {
      try {
        interface DirectoryItem {
          id: string;
          name: string;
          category: string;
          address?: string;
          city?: string;
          county?: string;
          phone?: string;
          description?: string;
          website?: string;
          featured?: boolean;
          claimed?: boolean;
          lat?: number;
          lng?: number;
        }
        const data = await apiClient<DirectoryItem[]>("/directory");
        if (!cancelled && data && data.length > 0) {
          const mapped: ServiceListing[] = data.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category as Category,
            address: item.address ?? "",
            city: item.city ?? "",
            county: item.county ?? "",
            phone: item.phone ?? "",
            description: item.description ?? "",
            website: item.website ?? undefined,
            featured: item.featured ?? false,
            claimed: item.claimed ?? false,
            lat: item.lat ?? 0,
            lng: item.lng ?? 0,
          }));
          setListings(mapped);
        }
      } catch {
        // API unavailable — keep hardcoded fallback
      }
    }
    fetchListings();
    return () => { cancelled = true; };
  }, []);

  // Helper: does a listing match the selected area?
  const matchesArea = useCallback((l: ServiceListing, area: string) => {
    if (area === "All") return true;
    if (area === "Fort Liberty") return l.city === "Fort Liberty";
    return l.county === area;
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      const matchesCategory = activeCategory === "All" || l.category === activeCategory;
      const matchesAreaFilter = matchesArea(l, activeArea);
      const matchesSearch =
        searchQuery.trim() === "" ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.county.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesAreaFilter && matchesSearch;
    });
  }, [searchQuery, activeCategory, activeArea, listings, matchesArea]);

  const categoryCount = useMemo(() => {
    const base = listings.filter((l) => matchesArea(l, activeArea));
    const counts: Record<string, number> = { All: base.length };
    for (const l of base) {
      counts[l.category] = (counts[l.category] || 0) + 1;
    }
    return counts;
  }, [activeArea, listings, matchesArea]);

  const areaCount = useMemo(() => {
    const counts: Record<string, number> = { All: listings.length };
    for (const county of COUNTIES) {
      counts[county] = listings.filter((l) => l.county === county).length;
    }
    // Fort Liberty = filter by city
    counts["Fort Liberty"] = listings.filter((l) => l.city === "Fort Liberty").length;
    return counts;
  }, [listings]);

  const handleMarkerClick = useCallback((listing: ServiceListing) => {
    setSelectedListing(listing);
    setTimeout(() => {
      const el = document.getElementById(`listing-card-${listing.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }, []);

  const handleCardClick = useCallback((listing: ServiceListing) => {
    setSelectedListing((prev) => (prev?.id === listing.id ? null : listing));
  }, []);

  return (
    <div className="space-y-10">
      {/* ================================================================= */}
      {/* Hero                                                              */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-background via-card to-background px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
            <Landmark className="h-4 w-4" />
            Serving {COUNTIES.length} Counties + Fort Liberty &middot; {listings.length}+ Services
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Community Services Directory
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground text-base sm:text-lg">
            Find government services, public safety, hospitals, utilities, agriculture,
            and more across Cumberland, Sampson, and the surrounding counties.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["Police", "Fire", "Hospitals", "Utilities", "Agriculture", "Veterans", "Transit", "Animal Services"].map((tag) => (
              <span key={tag} className="rounded-full bg-muted border border-border px-3 py-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Directory — Map (RIGHT) + List (LEFT)                            */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20">
            <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Government Services</h2>
            <p className="text-sm text-muted-foreground">Search police, fire, hospitals, utilities, agriculture &amp; more across {COUNTIES.length} counties</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by service, city, or county…"
            className="pl-10 h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Area dropdown */}
          <div className="space-y-1.5 flex-1 max-w-xs">
            <label htmlFor="area-filter" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              County / Area
            </label>
            <select
              id="area-filter"
              value={activeArea}
              onChange={(e) => setActiveArea(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              <option value="All">All Areas ({areaCount["All"]})</option>
              <optgroup label="Counties">
                {COUNTIES.map((county) => (
                  <option key={county} value={county}>
                    {county} County ({areaCount[county] || 0})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Military Installation">
                <option value="Fort Liberty">Fort Liberty (Fort Bragg) ({areaCount["Fort Liberty"] || 0})</option>
              </optgroup>
            </select>
          </div>

          {/* Service Type dropdown */}
          <div className="space-y-1.5 flex-1 max-w-xs">
            <label htmlFor="category-filter" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Service Type
            </label>
            <select
              id="category-filter"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as Category | "All")}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              <option value="All">All Service Types ({categoryCount["All"]})</option>
              {CATEGORIES.map(({ label }) => (
                <option key={label} value={label}>
                  {label} ({categoryCount[label] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredListings.length}</span>{" "}
          {filteredListings.length === 1 ? "service" : "services"}
          {activeCategory !== "All" && (
            <> in <span className="font-medium text-foreground">{activeCategory}</span></>
          )}
          {activeArea !== "All" && (
            <> &middot; <span className="font-medium text-foreground">{activeArea}{activeArea !== "Fort Liberty" ? " County" : ""}</span></>
          )}
        </p>

        {/* Split: List LEFT, Map RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List panel — LEFT */}
          <div ref={listRef} className="max-h-[600px] overflow-y-auto space-y-3 pr-1 scrollbar-thin lg:order-1">
            {filteredListings.length > 0 ? (
              filteredListings.map((listing) => (
                <ServiceCard
                  key={listing.id}
                  listing={listing}
                  isSelected={selectedListing?.id === listing.id}
                  onClick={() => handleCardClick(listing)}
                />
              ))
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/50">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No services found.</p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveCategory("All"); setActiveArea("All"); }}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:text-teal-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Map panel — RIGHT */}
          <div className="relative z-0 h-[600px] rounded-xl overflow-hidden border border-border shadow-lg lg:order-2">
            <CommunityMap
              businesses={filteredListings}
              selectedBusiness={selectedListing}
              onMarkerClick={handleMarkerClick}
              center={MAP_CENTER}
              categoryColors={CATEGORY_COLORS}
            />
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Claim Your Listing CTA                                            */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-teal-50 dark:from-teal-950/50 via-card to-blue-50 dark:to-blue-950/50 p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/20">
            <UserCheck className="h-7 w-7 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Claim & Manage Your Listing</h2>
          <p className="text-muted-foreground">
            Are you a government office, utility provider, or community service organization?
            Claim your listing to keep your contact information current and manage your public profile
            through your WCCG dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" className="bg-teal-600 hover:bg-teal-500 text-white" asChild>
              <Link href="/my/directory"><UserCheck className="mr-2 h-4 w-4" /> Claim Your Listing</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-border text-muted-foreground hover:text-foreground" asChild>
              <Link href="/my/directory"><Plus className="mr-2 h-4 w-4" /> Add New Service</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Free for all government &amp; community services. Log in or create an account to get started.
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* County Info Grid                                                   */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Counties We Serve</h2>
            <p className="text-sm text-muted-foreground">Government services coverage area in southeastern North Carolina</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COUNTIES.map((county) => {
            const count = areaCount[county] || 0;
            return (
              <button
                key={county}
                onClick={() => { setActiveArea(county); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="rounded-xl border border-border bg-muted/30 p-4 text-left transition-all hover:border-border hover:bg-muted/50"
              >
                <h3 className="font-semibold text-foreground">{county} County</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {count} {count === 1 ? "service" : "services"} listed
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Fort Liberty callout */}
      <section className="rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-50 dark:from-orange-950/30 via-card to-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Swords className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Fort Liberty (Fort Bragg)</h3>
            <p className="text-sm text-muted-foreground">
              Home of the XVIII Airborne Corps and U.S. Army Special Operations Command.
              Our directory includes {areaCount["Fort Liberty"] || 0}+ on-post services — DEERS/ID cards,
              Womack Army Medical Center, ACS, legal assistance, housing, commissary, PX,
              MWR, education center, finance, transportation, and more for soldiers, civilians, and families.
            </p>
            <button
              onClick={() => { setActiveArea("Fort Liberty"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:text-orange-300 font-medium"
            >
              View all Fort Liberty services →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service Listing Card
// ---------------------------------------------------------------------------

function ServiceCard({
  listing,
  isSelected,
  onClick,
}: {
  listing: ServiceListing;
  isSelected: boolean;
  onClick: () => void;
}) {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`;
  const categoryColor = CATEGORY_COLORS[listing.category];
  const CategoryIcon = CATEGORIES.find((c) => c.label === listing.category)?.icon || Landmark;

  return (
    <div
      id={`listing-card-${listing.id}`}
      onClick={onClick}
      className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-teal-500/50 bg-teal-500/5 shadow-lg shadow-teal-500/5"
          : "border-border bg-muted/30 hover:border-border hover:bg-muted/50"
      }`}
    >
      {/* Icon */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${categoryColor.marker}15` }}
      >
        <CategoryIcon className="h-5 w-5" style={{ color: categoryColor.marker }} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-foreground truncate">{listing.name}</h3>
          {listing.featured && (
            <Badge className="shrink-0 gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-500 dark:text-amber-300 border-amber-500/30 text-[10px]">
              <Star className="h-2.5 w-2.5" /> Featured
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{listing.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.city}, {listing.county} Co.</span>
          <a href={`tel:${listing.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 hover:text-teal-600 dark:text-teal-400" onClick={(e) => e.stopPropagation()}>
            <Phone className="h-3 w-3" />{listing.phone}
          </a>
        </div>
        <div className="flex gap-2 pt-0.5">
          {listing.website && (
            <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:text-teal-300 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:text-teal-300 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Navigation className="h-3 w-3" /> Directions
          </a>
          {!listing.claimed && (
            <Link
              href={`/my/directory?claim=${listing.id}`}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:text-amber-300 flex items-center gap-1 ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <UserCheck className="h-3 w-3" /> Claim
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
