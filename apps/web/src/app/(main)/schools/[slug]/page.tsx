import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Headphones,
  Music,
  Trophy,
  QrCode,
  Users,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { ShareCard } from "@/components/social/share-card";
import { getShareUrl, generateShareText } from "@/lib/share";
import { SCHOOLS } from "../page";

// ─── Static Params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return SCHOOLS.map((school) => ({ slug: school.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = SCHOOLS.find((s) => s.slug === slug);
  if (!school) {
    return { title: "School Not Found | WCCG 104.5 FM" };
  }
  return {
    title: `${school.name} | WCCG 104.5 FM`,
    description: `Listen to WCCG 104.5 FM with the ${school.mascot} at ${school.name}. Join your school's listening crew, request songs, and earn points.`,
  };
}

// ─── Feature Cards Data ───────────────────────────────────────────────────────

function getFeatures(schoolName: string) {
  return [
    {
      icon: Headphones,
      title: "Listen Together",
      description: `Join ${schoolName} listeners on WCCG`,
      gradient: "from-[#14b8a6] to-[#0d9488]",
    },
    {
      icon: Music,
      title: "Request Songs",
      description: "Vote for your school's anthem",
      gradient: "from-[#8b5cf6] to-[#7c3aed]",
    },
    {
      icon: Trophy,
      title: "Earn Points",
      description: "Compete on the school leaderboard",
      gradient: "from-[#f59e0b] to-[#d97706]",
    },
  ] as const;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = SCHOOLS.find((s) => s.slug === slug);

  if (!school) {
    notFound();
  }

  const features = getFeatures(school.name);
  const shareData = generateShareText("school", { name: school.name });
  const shareUrl = getShareUrl(`/schools/${school.slug}`, "school", "social", "school-page");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-10">
      {/* ── Back Link ────────────────────────────────────────────────── */}
      <div className="-mb-6">
        <Link
          href="/schools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Schools
        </Link>
      </div>

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative -mx-4 overflow-hidden rounded-none sm:-mx-6 sm:rounded-2xl md:-mx-8">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${school.colors.primary} 0%, ${school.colors.primary}dd 50%, ${school.colors.secondary}88 100%)`,
          }}
        />
        <div className="absolute inset-0">
          <div
            className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full blur-[100px]"
            style={{ backgroundColor: `${school.colors.secondary}33` }}
          />
        </div>

        <div className="relative px-6 py-14 sm:px-10 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">
                {school.mascot}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              {school.name}
            </h1>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Badge
                variant="secondary"
                className="bg-white/15 text-white border-white/20 hover:bg-white/20"
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                {school.studentCount.toLocaleString()} students
              </Badge>
              <Badge
                variant="secondary"
                className="bg-white/15 text-white border-white/20 hover:bg-white/20"
              >
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                {school.county} County
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Cards ────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="relative overflow-hidden"
            >
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── QR Code + Share Section ───────────────────────────────────── */}
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* QR Code */}
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#14b8a6]/10">
                <QrCode className="h-5 w-5 text-[#14b8a6]" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold">
                  Share with classmates
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scan this code to join your school on WCCG
                </p>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <Image
                  src={qrUrl}
                  alt={`QR code for ${school.name} on WCCG`}
                  width={200}
                  height={200}
                  className="h-40 w-40"
                  unoptimized
                />
              </div>
            </CardContent>
          </Card>

          {/* Share + Download */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1">
              <CardContent className="flex h-full flex-col items-center justify-center gap-4 py-8">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-semibold">
                    Spread the word
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Share {school.name}&apos;s page with friends and earn
                    bonus points
                  </p>
                </div>
                <ShareCard
                  title={shareData.title}
                  text={shareData.text}
                  url={shareUrl}
                  variant="card"
                />
              </CardContent>
            </Card>

            <Button asChild size="lg" className="w-full">
              <Link href="/download">Download the App</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
