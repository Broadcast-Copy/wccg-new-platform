import { BookOpen, Radio, Mic, Camera, Monitor, Music, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Trainings & Guides | WCCG 104.5 FM",
  description: "Training programs and educational resources at WCCG 104.5 FM for aspiring broadcasters and media professionals.",
};

const trainings = [
  {
    icon: Radio,
    title: "Broadcasting Fundamentals",
    description: "Learn the basics of FM and digital radio broadcasting, including FCC regulations, signal management, and broadcast operations.",
    duration: "4 weeks",
    format: "In-person at WCCG Studio",
  },
  {
    icon: Mic,
    title: "On-Air Personality Development",
    description: "Develop your on-air presence, voice techniques, show preparation, and audience engagement skills.",
    duration: "6 weeks",
    format: "In-person + Practical",
  },
  {
    icon: Music,
    title: "Audio Production & Mixing",
    description: "Master audio editing, commercial production, jingle creation, and sound design using industry-standard tools.",
    duration: "8 weeks",
    format: "Hands-on workshop",
  },
  {
    icon: Camera,
    title: "Digital Content Creation",
    description: "Learn to create compelling content for social media, podcasts, live streams, and digital platforms.",
    duration: "4 weeks",
    format: "Hybrid (in-person + online)",
  },
  {
    icon: Monitor,
    title: "Radio Sales & Advertising",
    description: "Understand media sales, client relationship management, campaign planning, and rate card fundamentals.",
    duration: "3 weeks",
    format: "In-person seminar",
  },
  {
    icon: BookOpen,
    title: "FCC Compliance & Regulations",
    description: "Comprehensive overview of FCC rules, EEO requirements, public file obligations, and broadcast law essentials.",
    duration: "2 weeks",
    format: "Online + In-person",
  },
];

export default function TrainingsPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Trainings & Guides</h1>
              <p className="text-white/50 mt-1">Develop your broadcasting and media skills</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Professional Development</h2>
        <p className="text-white/50 leading-relaxed">
          Whether you&apos;re an aspiring broadcaster, a current intern, or a media professional looking to sharpen your skills,
          WCCG 104.5 FM offers training programs designed to help you succeed in the radio and media industry.
          Our programs combine classroom learning with hands-on experience in a real broadcasting environment.
        </p>
      </div>

      {/* Training Programs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Available Programs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainings.map((training) => (
            <div key={training.title} className="rounded-xl border border-white/[0.06] bg-[#141420] p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <training.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">{training.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{training.description}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] font-medium text-white/60 bg-white/[0.06] rounded-full px-2.5 py-0.5">
                  {training.duration}
                </span>
                <span className="text-[10px] font-medium text-white/60 bg-white/[0.06] rounded-full px-2.5 py-0.5">
                  {training.format}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to Enroll */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">How to Enroll</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { step: "1", title: "Contact Us", desc: "Reach out to our team to discuss your interests and availability." },
            { step: "2", title: "Application", desc: "Complete a brief application and schedule an orientation session." },
            { step: "3", title: "Start Learning", desc: "Begin your training program and develop real-world media skills." },
          ].map((item) => (
            <div key={item.step} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#74ddc7]/10 text-[#74ddc7] text-sm font-bold mb-2">
                {item.step}
              </span>
              <h3 className="font-medium text-white text-sm">{item.title}</h3>
              <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0] px-6">
          <Link href="/contact">
            Inquire About Training
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5">
          <Link href="/careers/internships">Internship Program</Link>
        </Button>
      </div>
    </div>
  );
}
