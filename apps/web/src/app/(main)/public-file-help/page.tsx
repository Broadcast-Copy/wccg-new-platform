import { HelpCircle, FileText, Phone, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Public File Help | WCCG 104.5 FM",
  description: "Learn how to access and navigate the WCCG 104.5 FM public inspection file.",
};

const steps = [
  {
    step: "1",
    title: "Visit the FCC Public File Website",
    description: "Navigate to publicfiles.fcc.gov and search for WCCG or facility ID 55226.",
  },
  {
    step: "2",
    title: "Browse Available Documents",
    description: "The file contains ownership reports, political files, EEO reports, contour maps, and more.",
  },
  {
    step: "3",
    title: "Download or View Documents",
    description: "Click on any document category to view or download the files you need.",
  },
  {
    step: "4",
    title: "Contact Us for Help",
    description: "If you can't find what you're looking for, contact our office and we'll assist you.",
  },
];

export default function PublicFileHelpPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-xl">
              <HelpCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Public File Help</h1>
              <p className="text-muted-foreground mt-1">How to access the WCCG 104.5 FM public inspection file</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">What is the Public Inspection File?</h2>
        <p className="text-muted-foreground leading-relaxed">
          The FCC requires broadcast stations to maintain a public inspection file containing information about station operations,
          programming, and regulatory compliance. This file is available to anyone who wishes to review it.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Common documents in the public file include ownership reports, political advertising records, EEO (Equal Employment Opportunity)
          reports, community issues lists, and contour maps.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">How to Access</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] text-sm font-bold">
                  {item.step}
                </span>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-11">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">In-Person Access</h2>
        <p className="text-muted-foreground leading-relaxed">
          You may also review the public inspection file in person at our studio during regular business hours.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-[#74ddc7]" />
            115 Gillespie Street, Fayetteville, NC 28301
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-[#74ddc7]" />
            Monday – Friday, 8:30 AM – 5:30 PM
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 text-[#74ddc7]" />
            (910) 484-4932
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
          <Link href="/public-file">View Public Inspection File</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-foreground hover:bg-white/5">
          <Link href="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
