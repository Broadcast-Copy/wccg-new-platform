import { GraduationCap, Calendar, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Internships | WCCG 104.5 FM",
  description: "Internship opportunities at WCCG 104.5 FM — gain real-world radio and media experience.",
};

const departments = [
  {
    title: "On-Air & Programming",
    description: "Shadow DJs and hosts, learn radio programming, assist with music scheduling, and gain on-air experience.",
  },
  {
    title: "Production & Engineering",
    description: "Learn audio production, mixing, editing, and broadcasting equipment operation.",
  },
  {
    title: "Sales & Marketing",
    description: "Assist with client relations, campaign planning, and digital marketing initiatives.",
  },
  {
    title: "Digital & Social Media",
    description: "Create content for social media, manage online engagement, and assist with web platform development.",
  },
  {
    title: "Events & Promotions",
    description: "Help plan and execute station events, community outreach, and promotional campaigns.",
  },
  {
    title: "News & Community Affairs",
    description: "Assist with local news coverage, community stories, and public affairs programming.",
  },
];

const requirements = [
  "Currently enrolled in a college or university program (or recent graduate within 6 months)",
  "Strong interest in broadcasting, media, journalism, or communications",
  "Ability to commit to a minimum of 15 hours per week",
  "Reliable transportation to our Fayetteville studio",
  "Must receive academic credit or meet applicable internship program requirements",
  "Strong communication and organizational skills",
  "Positive attitude and willingness to learn",
];

export default function InternshipsPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-green-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Internship Program</h1>
              <p className="text-white/50 mt-1">Launch your media career with hands-on experience</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">About the Program</h2>
        <p className="text-white/50 leading-relaxed">
          The WCCG 104.5 FM Internship Program offers students and aspiring media professionals the opportunity
          to gain real-world experience in a professional broadcasting environment. Our interns work alongside
          experienced radio professionals and contribute to live programming, events, and digital content.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-white/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#74ddc7]" />
            Spring, Summer, and Fall sessions
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#74ddc7]" />
            15-20 hours per week
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Available Departments</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.title} className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
              <h3 className="font-semibold text-white mb-2">{dept.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{dept.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Requirements</h2>
        <ul className="space-y-2">
          {requirements.map((req, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/50">
              <CheckCircle2 className="h-4 w-4 text-[#74ddc7] mt-0.5 shrink-0" />
              {req}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0] px-6">
          <Link href="/careers">
            Apply Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
          <Link href="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
