import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  MapPin,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface School {
  slug: string;
  name: string;
  mascot: string;
  colors: { primary: string; secondary: string };
  county: string;
  studentCount: number;
}

// ─── School Data ──────────────────────────────────────────────────────────────

export const SCHOOLS: School[] = [
  {
    slug: "terry-sanford",
    name: "Terry Sanford High School",
    mascot: "Bulldogs",
    colors: { primary: "#003087", secondary: "#C4A84F" },
    county: "Cumberland",
    studentCount: 1200,
  },
  {
    slug: "ee-smith",
    name: "E.E. Smith High School",
    mascot: "Golden Bulls",
    colors: { primary: "#FFD700", secondary: "#000000" },
    county: "Cumberland",
    studentCount: 1100,
  },
  {
    slug: "cape-fear",
    name: "Cape Fear High School",
    mascot: "Colts",
    colors: { primary: "#CC0000", secondary: "#FFFFFF" },
    county: "Cumberland",
    studentCount: 1000,
  },
  {
    slug: "south-view",
    name: "South View High School",
    mascot: "Tigers",
    colors: { primary: "#FF6600", secondary: "#000000" },
    county: "Cumberland",
    studentCount: 1400,
  },
  {
    slug: "pine-forest",
    name: "Pine Forest High School",
    mascot: "Trojans",
    colors: { primary: "#006633", secondary: "#FFD700" },
    county: "Cumberland",
    studentCount: 1300,
  },
  {
    slug: "douglas-byrd",
    name: "Douglas Byrd High School",
    mascot: "Eagles",
    colors: { primary: "#800020", secondary: "#C0C0C0" },
    county: "Cumberland",
    studentCount: 900,
  },
  {
    slug: "jack-britt",
    name: "Jack Britt High School",
    mascot: "Buccaneers",
    colors: { primary: "#CC0000", secondary: "#000000" },
    county: "Cumberland",
    studentCount: 1500,
  },
  {
    slug: "seventy-first",
    name: "Seventy-First High School",
    mascot: "Falcons",
    colors: { primary: "#003366", secondary: "#CC0000" },
    county: "Cumberland",
    studentCount: 1100,
  },
];

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "WCCG in Your School | WCCG 104.5 FM",
  description:
    "Connect with WCCG 104.5 FM at your school. Listen together, request songs, and compete on your school leaderboard.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolsPage() {
  return (
    <div className="space-y-10">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 md:-mx-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#134e4a]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-[#14b8a6]/20 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#5eead4]/15 blur-[80px]" />
        </div>

        <div className="relative px-6 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-[#5eead4]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#5eead4]">
                School Program
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              WCCG in Your{" "}
              <span className="text-[#5eead4]">School</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              Listen together, request songs, and earn points for your school.
              Join the Fayetteville-area schools already on WCCG 104.5 FM.
            </p>
          </div>
        </div>
      </div>

      {/* ── Schools Grid ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCHOOLS.map((school) => (
            <Link key={school.slug} href={`/schools/${school.slug}`}>
              <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
                {/* Colored accent bar */}
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: school.colors.primary }}
                />
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold leading-tight text-foreground group-hover:text-[#14b8a6] transition-colors">
                          {school.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {school.mascot}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#14b8a6] transition-colors mt-0.5" />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {school.studentCount.toLocaleString()} students
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {school.county} Co.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CTA Section ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl text-center">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14b8a6]/10">
              <GraduationCap className="h-6 w-6 text-[#14b8a6]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                Want your school listed?
              </h3>
              <p className="text-sm text-muted-foreground">
                Contact us to add your school to the WCCG program and start
                earning points for your community.
              </p>
            </div>
            <Button asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
