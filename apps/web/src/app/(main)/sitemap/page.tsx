import { Map, Radio, CalendarDays, Users2, ShoppingBag, Gift, Headphones, Mic, Mail, Shield, FileText, Briefcase, Megaphone, Palette } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sitemap | WCCG 104.5 FM",
  description: "Full sitemap of the WCCG 104.5 FM digital platform — find every page at a glance.",
};

const sections = [
  {
    title: "Listen",
    icon: Headphones,
    links: [
      { label: "Channel Guide", href: "/channels" },
      { label: "Discover", href: "/discover" },
      { label: "Shows", href: "/shows" },
      { label: "Hosts & DJs", href: "/hosts" },
      { label: "DJ Mixes", href: "/mixes" },
      { label: "Schedule", href: "/schedule" },
    ],
  },
  {
    title: "Community",
    icon: Users2,
    links: [
      { label: "Events & Tickets", href: "/events" },
      { label: "Community Directory", href: "/community" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "mY1045 Perks", href: "/rewards" },
    ],
  },
  {
    title: "Connect",
    icon: Mail,
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Innovation Center", href: "/innovation-center" },
    ],
  },
  {
    title: "For Advertisers",
    icon: Megaphone,
    links: [
      { label: "Become An Advertiser", href: "/advertise" },
      { label: "Advertiser Portal", href: "/advertise/portal" },
      { label: "Advertiser Guidelines", href: "/advertise/guidelines" },
      { label: "WCCG Media Kit", href: "/advertise/media-kit" },
    ],
  },
  {
    title: "For Creators",
    icon: Mic,
    links: [
      { label: "Become A Creator", href: "/creators" },
      { label: "Podcast & Launch", href: "/creators/podcast" },
      { label: "Upload Music", href: "/creators/upload-music" },
    ],
  },
  {
    title: "Careers",
    icon: Briefcase,
    links: [
      { label: "Employment", href: "/careers" },
      { label: "Internships", href: "/careers/internships" },
      { label: "Volunteer", href: "/careers/volunteer" },
      { label: "Trainings & Guides", href: "/careers/trainings" },
    ],
  },
  {
    title: "Legal & Compliance",
    icon: Shield,
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Legal", href: "/legal" },
      { label: "Contest Rules", href: "/contest-rules" },
      { label: "Brand Guidelines", href: "/brand-guidelines" },
      { label: "Contest Guidelines", href: "/contest-guidelines" },
      { label: "Public Inspection File", href: "/public-file" },
      { label: "Public File Help", href: "/public-file-help" },
      { label: "FCC Applications", href: "/fcc-applications" },
      { label: "EEO Report", href: "/eeo" },
    ],
  },
  {
    title: "Account",
    icon: Gift,
    links: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "My Dashboard", href: "/my" },
      { label: "My Events", href: "/my/events" },
      { label: "My Tickets", href: "/my/tickets" },
      { label: "My Favorites", href: "/my/favorites" },
      { label: "My Points", href: "/my/points" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
              <Map className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Sitemap</h1>
              <p className="text-white/50 mt-1">Every page on the WCCG 104.5 FM platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-white/[0.06] bg-[#141420] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <section.icon className="h-5 w-5 text-[#74ddc7]" />
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            </div>
            <nav className="flex flex-col gap-1.5">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/40 hover:text-[#74ddc7] transition-colors pl-7"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </div>
  );
}
