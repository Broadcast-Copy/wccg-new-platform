"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  FileText,
  MessageSquare,
  Calendar,
  ArrowRight,
  MoreHorizontal,
  Eye,
  Edit,
  ChevronRight,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  PhoneCall,
  RefreshCw,
  Star,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ---------- Types ---------- */

type PipelineStage =
  | "Lead"
  | "Contacted"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

interface CampaignHistory {
  name: string;
  startDate: string;
  endDate: string;
  spend: number;
  status: "Completed" | "Active" | "Cancelled";
}

interface ContractTerms {
  startDate: string;
  endDate: string;
  monthlyRate: number;
  adTypes: string[];
}

interface ClientNote {
  date: string;
  author: string;
  text: string;
}

interface ActivityItem {
  date: string;
  type: "call" | "email" | "proposal" | "meeting" | "contract" | "note";
  description: string;
}

interface Client {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  stage: PipelineStage;
  monthlySpend: number;
  lastContact: string;
  address: string;
  campaigns: CampaignHistory[];
  contract: ContractTerms;
  notes: ClientNote[];
  activities: ActivityItem[];
}

/* ---------- Mock Data ---------- */

const MOCK_CLIENTS: Client[] = [
  {
    id: "c1",
    businessName: "Cross Creek Mall",
    contactPerson: "Sarah Mitchell",
    email: "smitchell@crosscreekmall.com",
    phone: "(910) 868-4422",
    category: "Retail",
    stage: "Closed Won",
    monthlySpend: 2400,
    lastContact: "2026-02-20",
    address: "419 Cross Creek Mall, Fayetteville, NC 28303",
    campaigns: [
      { name: "Holiday Shopping Blitz", startDate: "2025-11-15", endDate: "2025-12-31", spend: 7200, status: "Completed" },
      { name: "Spring Fashion Drive", startDate: "2026-01-10", endDate: "2026-03-31", spend: 5400, status: "Active" },
      { name: "Back to School 2025", startDate: "2025-07-15", endDate: "2025-09-01", spend: 4800, status: "Completed" },
    ],
    contract: {
      startDate: "2025-06-01",
      endDate: "2026-05-31",
      monthlyRate: 2400,
      adTypes: ["30s Spot", "15s Spot", "Live Read", "Digital Banner"],
    },
    notes: [
      { date: "2026-02-20", author: "Marcus Johnson", text: "Sarah confirmed renewal for another 12 months. Wants to add weekend spots." },
      { date: "2026-01-15", author: "Lisa Chen", text: "Discussed adding digital banner package. Sending updated proposal." },
      { date: "2025-12-10", author: "Marcus Johnson", text: "Holiday campaign performing well. Client very satisfied with ROI." },
    ],
    activities: [
      { date: "2026-02-20", type: "meeting", description: "In-person renewal meeting with Sarah Mitchell" },
      { date: "2026-02-10", type: "email", description: "Sent Q1 performance report" },
      { date: "2026-01-28", type: "call", description: "Follow-up call about digital expansion" },
      { date: "2026-01-15", type: "proposal", description: "Sent digital banner add-on proposal" },
      { date: "2025-12-10", type: "note", description: "Positive feedback on holiday campaign performance" },
    ],
  },
  {
    id: "c2",
    businessName: "Cape Fear Valley Health",
    contactPerson: "Dr. James Rodriguez",
    email: "jrodriguez@capefearvalley.com",
    phone: "(910) 615-4000",
    category: "Healthcare",
    stage: "Closed Won",
    monthlySpend: 5200,
    lastContact: "2026-02-18",
    address: "1638 Owen Dr, Fayetteville, NC 28304",
    campaigns: [
      { name: "Flu Season Awareness", startDate: "2025-10-01", endDate: "2026-02-28", spend: 15600, status: "Active" },
      { name: "New Urgent Care Promo", startDate: "2025-08-01", endDate: "2025-10-31", spend: 9360, status: "Completed" },
      { name: "Health Fair Sponsorship", startDate: "2025-05-01", endDate: "2025-05-31", spend: 5200, status: "Completed" },
    ],
    contract: {
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      monthlyRate: 5200,
      adTypes: ["60s Spot", "30s Spot", "Sponsorship", "Live Remote"],
    },
    notes: [
      { date: "2026-02-18", author: "Marcus Johnson", text: "Dr. Rodriguez pleased with community health campaign reach. Discussing annual renewal." },
      { date: "2026-01-22", author: "Lisa Chen", text: "Requested targeting data for morning drive time listeners." },
    ],
    activities: [
      { date: "2026-02-18", type: "meeting", description: "Quarterly review meeting at Cape Fear Valley" },
      { date: "2026-02-05", type: "email", description: "Sent listener demographics report" },
      { date: "2026-01-22", type: "call", description: "Call with marketing director about targeting" },
      { date: "2026-01-10", type: "contract", description: "Signed amendment for additional flu season spots" },
      { date: "2025-12-20", type: "email", description: "Sent holiday schedule confirmation" },
    ],
  },
  {
    id: "c3",
    businessName: "Fort Liberty Auto Group",
    contactPerson: "Mike Thompson",
    email: "mthompson@fortlibertyauto.com",
    phone: "(910) 867-9230",
    category: "Automotive",
    stage: "Closed Won",
    monthlySpend: 3800,
    lastContact: "2026-02-15",
    address: "5544 Yadkin Rd, Fayetteville, NC 28303",
    campaigns: [
      { name: "Presidents Day Sale", startDate: "2026-02-01", endDate: "2026-02-28", spend: 5700, status: "Active" },
      { name: "Year-End Clearance", startDate: "2025-11-20", endDate: "2025-12-31", spend: 7600, status: "Completed" },
    ],
    contract: {
      startDate: "2025-09-01",
      endDate: "2026-08-31",
      monthlyRate: 3800,
      adTypes: ["30s Spot", "15s Spot", "Weekend Blitz", "Digital Pre-Roll"],
    },
    notes: [
      { date: "2026-02-15", author: "Marcus Johnson", text: "Mike happy with Presidents Day campaign traffic. Wants to plan Memorial Day event early." },
      { date: "2026-01-05", author: "Lisa Chen", text: "Clearance event drove record lot traffic. Client attributed 30% increase to radio ads." },
    ],
    activities: [
      { date: "2026-02-15", type: "call", description: "Quick call about Memorial Day campaign planning" },
      { date: "2026-02-01", type: "contract", description: "Presidents Day campaign launched" },
      { date: "2026-01-20", type: "proposal", description: "Sent Presidents Day campaign proposal" },
      { date: "2026-01-05", type: "meeting", description: "Post-clearance event review meeting" },
      { date: "2025-11-20", type: "contract", description: "Year-end clearance campaign launched" },
    ],
  },
  {
    id: "c4",
    businessName: "Fayetteville State University",
    contactPerson: "Angela Brooks",
    email: "abrooks@uncfsu.edu",
    phone: "(910) 672-1111",
    category: "Education",
    stage: "Closed Won",
    monthlySpend: 1600,
    lastContact: "2026-02-12",
    address: "1200 Murchison Rd, Fayetteville, NC 28301",
    campaigns: [
      { name: "Spring Enrollment Drive", startDate: "2026-01-15", endDate: "2026-04-15", spend: 4800, status: "Active" },
      { name: "Homecoming 2025", startDate: "2025-10-01", endDate: "2025-10-31", spend: 2400, status: "Completed" },
    ],
    contract: {
      startDate: "2025-08-01",
      endDate: "2026-07-31",
      monthlyRate: 1600,
      adTypes: ["30s Spot", "Live Read", "Event Sponsorship"],
    },
    notes: [
      { date: "2026-02-12", author: "Lisa Chen", text: "Angela wants to increase spots during evening drive for spring enrollment push." },
    ],
    activities: [
      { date: "2026-02-12", type: "call", description: "Discussed evening drive time availability" },
      { date: "2026-01-15", type: "contract", description: "Spring enrollment campaign launched" },
      { date: "2025-11-10", type: "email", description: "Sent homecoming campaign wrap-up report" },
      { date: "2025-10-01", type: "contract", description: "Homecoming campaign launched" },
      { date: "2025-08-01", type: "contract", description: "Annual contract signed" },
    ],
  },
  {
    id: "c5",
    businessName: "PWC (Public Works Commission)",
    contactPerson: "David Martin",
    email: "dmartin@faypwc.com",
    phone: "(910) 483-1382",
    category: "Utilities",
    stage: "Negotiation",
    monthlySpend: 2100,
    lastContact: "2026-02-22",
    address: "955 Old Wilmington Rd, Fayetteville, NC 28301",
    campaigns: [
      { name: "Water Conservation PSA", startDate: "2025-06-01", endDate: "2025-08-31", spend: 6300, status: "Completed" },
    ],
    contract: {
      startDate: "2025-06-01",
      endDate: "2025-12-31",
      monthlyRate: 2100,
      adTypes: ["30s Spot", "PSA Sponsorship"],
    },
    notes: [
      { date: "2026-02-22", author: "Marcus Johnson", text: "In renewal discussions. David wants to expand to include energy savings campaign for summer." },
      { date: "2026-01-30", author: "Lisa Chen", text: "Previous contract expired. Sent renewal proposal with expanded package." },
    ],
    activities: [
      { date: "2026-02-22", type: "meeting", description: "Renewal negotiation meeting at PWC offices" },
      { date: "2026-02-10", type: "proposal", description: "Sent expanded 2026 advertising proposal" },
      { date: "2026-01-30", type: "email", description: "Follow-up on contract expiration" },
      { date: "2025-12-15", type: "call", description: "Year-end check-in call" },
      { date: "2025-08-31", type: "note", description: "Water conservation campaign completed successfully" },
    ],
  },
  {
    id: "c6",
    businessName: "Segra Stadium",
    contactPerson: "Kevin Walsh",
    email: "kwalsh@segrastadium.com",
    phone: "(910) 339-1989",
    category: "Entertainment",
    stage: "Closed Won",
    monthlySpend: 4500,
    lastContact: "2026-02-19",
    address: "460 Hay St, Fayetteville, NC 28301",
    campaigns: [
      { name: "2026 Season Opener", startDate: "2026-02-15", endDate: "2026-04-15", spend: 9000, status: "Active" },
      { name: "Concert Series Promo", startDate: "2025-05-01", endDate: "2025-09-30", spend: 22500, status: "Completed" },
      { name: "Holiday Events", startDate: "2025-11-01", endDate: "2025-12-31", spend: 9000, status: "Completed" },
    ],
    contract: {
      startDate: "2025-03-01",
      endDate: "2026-02-28",
      monthlyRate: 4500,
      adTypes: ["60s Spot", "30s Spot", "Live Remote", "Event Sponsorship", "Digital Banner"],
    },
    notes: [
      { date: "2026-02-19", author: "Marcus Johnson", text: "Kevin confirmed full season partnership renewal. Adding social media cross-promotion." },
      { date: "2026-01-10", author: "Lisa Chen", text: "Planning season opener campaign. Strong budget allocated." },
    ],
    activities: [
      { date: "2026-02-19", type: "contract", description: "2026 season partnership renewed" },
      { date: "2026-02-15", type: "contract", description: "Season opener campaign launched" },
      { date: "2026-01-10", type: "meeting", description: "Season planning meeting" },
      { date: "2025-12-31", type: "note", description: "Holiday events campaign wrapped up" },
      { date: "2025-11-01", type: "contract", description: "Holiday events campaign launched" },
    ],
  },
  {
    id: "c7",
    businessName: "Crown Complex",
    contactPerson: "Patricia Evans",
    email: "pevans@crowncomplex.com",
    phone: "(910) 438-4100",
    category: "Venues",
    stage: "Proposal",
    monthlySpend: 3200,
    lastContact: "2026-02-17",
    address: "1960 Coliseum Dr, Fayetteville, NC 28306",
    campaigns: [
      { name: "Spring Concert Series", startDate: "2025-03-01", endDate: "2025-06-30", spend: 12800, status: "Completed" },
    ],
    contract: {
      startDate: "2025-03-01",
      endDate: "2025-09-30",
      monthlyRate: 3200,
      adTypes: ["30s Spot", "Live Remote", "Event Sponsorship"],
    },
    notes: [
      { date: "2026-02-17", author: "Lisa Chen", text: "Patricia reviewing new proposal for 2026 event season. Wants more aggressive digital presence." },
      { date: "2026-02-01", author: "Marcus Johnson", text: "Reconnected after contract gap. They have a strong 2026 event calendar." },
    ],
    activities: [
      { date: "2026-02-17", type: "proposal", description: "Sent 2026 comprehensive advertising proposal" },
      { date: "2026-02-01", type: "call", description: "Reactivation call with Patricia Evans" },
      { date: "2025-10-15", type: "email", description: "Post-contract follow-up email" },
      { date: "2025-09-30", type: "note", description: "Contract expired, client pausing for budget review" },
      { date: "2025-06-30", type: "note", description: "Spring concert series campaign completed" },
    ],
  },
  {
    id: "c8",
    businessName: "Village Family Dental",
    contactPerson: "Dr. Wendy Palmer",
    email: "wpalmer@villagefamilydental.com",
    phone: "(910) 485-8884",
    category: "Healthcare",
    stage: "Closed Won",
    monthlySpend: 1200,
    lastContact: "2026-02-10",
    address: "3214 Village Dr, Fayetteville, NC 28304",
    campaigns: [
      { name: "New Patient Special", startDate: "2026-01-01", endDate: "2026-06-30", spend: 7200, status: "Active" },
      { name: "Back to School Checkups", startDate: "2025-07-15", endDate: "2025-08-31", spend: 1800, status: "Completed" },
    ],
    contract: {
      startDate: "2025-07-01",
      endDate: "2026-06-30",
      monthlyRate: 1200,
      adTypes: ["30s Spot", "Live Read"],
    },
    notes: [
      { date: "2026-02-10", author: "Lisa Chen", text: "Dr. Palmer reports steady increase in new patients since campaign launch." },
    ],
    activities: [
      { date: "2026-02-10", type: "call", description: "Monthly check-in call" },
      { date: "2026-01-01", type: "contract", description: "New patient special campaign launched" },
      { date: "2025-11-15", type: "email", description: "Sent renewal proposal" },
      { date: "2025-08-31", type: "note", description: "Back to school campaign completed" },
      { date: "2025-07-15", type: "contract", description: "Back to school campaign launched" },
    ],
  },
  {
    id: "c9",
    businessName: "Cross Creek Barbershop",
    contactPerson: "Jerome Washington",
    email: "jerome@crosscreekbarber.com",
    phone: "(910) 822-5501",
    category: "Services",
    stage: "Lead",
    monthlySpend: 800,
    lastContact: "2026-02-21",
    address: "102 Tallywood Shopping Ctr, Fayetteville, NC 28303",
    campaigns: [],
    contract: {
      startDate: "",
      endDate: "",
      monthlyRate: 800,
      adTypes: [],
    },
    notes: [
      { date: "2026-02-21", author: "Marcus Johnson", text: "Jerome attended our local business advertising seminar. Very interested in radio for community reach." },
      { date: "2026-02-14", author: "Lisa Chen", text: "Initial inquiry through website. Wants info on affordable small business packages." },
    ],
    activities: [
      { date: "2026-02-21", type: "meeting", description: "Met Jerome at WCCG local business seminar" },
      { date: "2026-02-14", type: "email", description: "Received inquiry through website contact form" },
    ],
  },
  {
    id: "c10",
    businessName: "Southern Comfort Restaurant",
    contactPerson: "Diane Foster",
    email: "diane@southerncomfortnc.com",
    phone: "(910) 491-2855",
    category: "Food & Dining",
    stage: "Contacted",
    monthlySpend: 1100,
    lastContact: "2026-02-16",
    address: "2115 Skibo Rd, Fayetteville, NC 28314",
    campaigns: [],
    contract: {
      startDate: "",
      endDate: "",
      monthlyRate: 1100,
      adTypes: [],
    },
    notes: [
      { date: "2026-02-16", author: "Lisa Chen", text: "Diane interested in lunch-hour drive time spots. Wants to boost weekday lunch traffic." },
    ],
    activities: [
      { date: "2026-02-16", type: "call", description: "Discovery call about advertising goals" },
      { date: "2026-02-08", type: "email", description: "Sent introductory email with media kit" },
      { date: "2026-02-05", type: "note", description: "Referral from Cross Creek Mall contact Sarah Mitchell" },
    ],
  },
  {
    id: "c11",
    businessName: "Bragg Boulevard Motors",
    contactPerson: "Tony Williams",
    email: "twilliams@braggblvdmotors.com",
    phone: "(910) 864-1009",
    category: "Automotive",
    stage: "Contacted",
    monthlySpend: 2800,
    lastContact: "2026-02-13",
    address: "3800 Bragg Blvd, Fayetteville, NC 28303",
    campaigns: [],
    contract: {
      startDate: "",
      endDate: "",
      monthlyRate: 2800,
      adTypes: [],
    },
    notes: [
      { date: "2026-02-13", author: "Marcus Johnson", text: "Tony met with us after seeing Fort Liberty Auto Group success. Wants competitive package." },
    ],
    activities: [
      { date: "2026-02-13", type: "meeting", description: "Initial meeting at dealership" },
      { date: "2026-02-07", type: "call", description: "Cold call intro - showed strong interest" },
    ],
  },
  {
    id: "c12",
    businessName: "Carolina Insurance Group",
    contactPerson: "Rebecca Lane",
    email: "rlane@carolinainsurance.com",
    phone: "(910) 860-3300",
    category: "Insurance",
    stage: "Proposal",
    monthlySpend: 1900,
    lastContact: "2026-02-19",
    address: "286 N Eastern Blvd, Fayetteville, NC 28301",
    campaigns: [
      { name: "Hurricane Season Prep", startDate: "2025-06-01", endDate: "2025-08-31", spend: 5700, status: "Completed" },
    ],
    contract: {
      startDate: "2025-06-01",
      endDate: "2025-11-30",
      monthlyRate: 1900,
      adTypes: ["30s Spot", "PSA Sponsorship"],
    },
    notes: [
      { date: "2026-02-19", author: "Lisa Chen", text: "Rebecca reviewing year-round proposal. Wants to focus on homeowner and auto insurance messaging." },
      { date: "2026-01-28", author: "Marcus Johnson", text: "Great previous campaign results. Reconnected about 2026 plans." },
    ],
    activities: [
      { date: "2026-02-19", type: "proposal", description: "Sent 12-month advertising proposal" },
      { date: "2026-02-05", type: "call", description: "Follow-up call on proposal" },
      { date: "2026-01-28", type: "meeting", description: "Lunch meeting to discuss 2026 advertising" },
      { date: "2025-12-01", type: "email", description: "Post-contract follow-up" },
      { date: "2025-08-31", type: "note", description: "Hurricane season campaign completed - strong results" },
    ],
  },
];

/* ---------- Constants ---------- */

const STAGE_STYLES: Record<PipelineStage, string> = {
  Lead: "bg-white/[0.06] text-white/50 border-white/[0.08]",
  Contacted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Proposal: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Negotiation: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Closed Won": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Closed Lost": "bg-red-500/10 text-red-400 border-red-500/20",
};

const PIPELINE_COLORS: Record<PipelineStage, string> = {
  Lead: "bg-white/20",
  Contacted: "bg-blue-500",
  Proposal: "bg-yellow-500",
  Negotiation: "bg-orange-500",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-500",
};

const PIPELINE_TEXT_COLORS: Record<PipelineStage, string> = {
  Lead: "text-white/60",
  Contacted: "text-blue-400",
  Proposal: "text-yellow-400",
  Negotiation: "text-orange-400",
  "Closed Won": "text-emerald-400",
  "Closed Lost": "text-red-400",
};

const ACTIVITY_ICONS: Record<ActivityItem["type"], typeof Phone> = {
  call: PhoneCall,
  email: Send,
  proposal: FileText,
  meeting: Users,
  contract: CheckCircle2,
  note: MessageSquare,
};

const ACTIVITY_COLORS: Record<ActivityItem["type"], string> = {
  call: "text-blue-400 bg-blue-500/10",
  email: "text-purple-400 bg-purple-500/10",
  proposal: "text-yellow-400 bg-yellow-500/10",
  meeting: "text-emerald-400 bg-emerald-500/10",
  contract: "text-red-400 bg-red-500/10",
  note: "text-white/40 bg-white/[0.06]",
};

const CATEGORIES = [
  "Retail",
  "Healthcare",
  "Automotive",
  "Education",
  "Utilities",
  "Entertainment",
  "Venues",
  "Services",
  "Food & Dining",
  "Insurance",
  "Real Estate",
  "Legal",
  "Financial Services",
  "Other",
];

/* ---------- Helpers ---------- */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysAgo(iso: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return `${Math.floor(diff / 30)} months ago`;
}

/* ---------- Pipeline Stages Bar ---------- */

function PipelineBar({ clients }: { clients: Client[] }) {
  const stages: PipelineStage[] = [
    "Lead",
    "Contacted",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];

  const counts: Record<PipelineStage, number> = {
    Lead: 12,
    Contacted: 8,
    Proposal: 6,
    Negotiation: 4,
    "Closed Won": 15,
    "Closed Lost": 2,
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Sales Pipeline</h2>
        <span className="text-xs text-white/40">{total} total opportunities</span>
      </div>

      {/* Visual bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
        {stages.map((stage) => {
          const pct = (counts[stage] / total) * 100;
          return (
            <div
              key={stage}
              className={`${PIPELINE_COLORS[stage]} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${stage}: ${counts[stage]}`}
            />
          );
        })}
      </div>

      {/* Stage labels */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stages.map((stage) => (
          <div key={stage} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className={`h-2 w-2 rounded-full ${PIPELINE_COLORS[stage]}`} />
              <span className={`text-lg font-bold ${PIPELINE_TEXT_COLORS[stage]}`}>
                {counts[stage]}
              </span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider leading-none">
              {stage}
            </span>
          </div>
        ))}
      </div>

      {/* Arrow flow */}
      <div className="hidden sm:flex items-center justify-between mt-3 px-4">
        {stages.slice(0, -1).map((stage, i) => (
          <div key={stage} className="flex items-center gap-1 text-white/20">
            <ChevronRight className="h-3 w-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Client Detail Dialog ---------- */

function ClientDetailDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 shrink-0">
              <Building2 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <span>{client.businessName}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`text-[10px] border ${STAGE_STYLES[client.stage]}`}>
                  {client.stage}
                </Badge>
                <span className="text-xs text-muted-foreground font-normal">
                  {client.category}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contact" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Contact</span>
                <span className="font-medium">{client.contactPerson}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Email</span>
                <span className="font-medium">{client.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Phone</span>
                <span className="font-medium">{client.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Address</span>
                <span className="font-medium">{client.address}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Monthly</span>
                <span className="font-medium">{formatCurrency(client.monthlySpend)}/mo</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24">Last Contact</span>
                <span className="font-medium">{formatDate(client.lastContact)}</span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </h4>
              <div className="space-y-3">
                {client.notes.map((note, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-xs">{note.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.date)}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4 mt-4">
            {client.campaigns.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No campaign history yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {client.campaigns.map((campaign, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{campaign.name}</h4>
                      <Badge
                        className={`text-[10px] border ${
                          campaign.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : campaign.status === "Completed"
                              ? "bg-white/[0.06] text-muted-foreground border-white/[0.08]"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatShortDate(campaign.startDate)} - {formatShortDate(campaign.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(campaign.spend)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Campaign Spend</span>
                <span className="font-bold">
                  {formatCurrency(
                    client.campaigns.reduce((sum, c) => sum + c.spend, 0)
                  )}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract" className="space-y-4 mt-4">
            {!client.contract.startDate ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active contract. Client is in {client.stage} stage.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-semibold mb-3">Contract Terms</h4>
                  <div className="grid gap-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="font-medium">{formatDate(client.contract.startDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="font-medium">{formatDate(client.contract.endDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Rate</span>
                      <span className="font-medium">{formatCurrency(client.contract.monthlyRate)}/mo</span>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Ad Types</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {client.contract.adTypes.map((type) => (
                          <Badge key={type} variant="outline" className="text-[10px]">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Contract {new Date(client.contract.endDate) > new Date() ? "expires" : "expired"}{" "}
                    {formatDate(client.contract.endDate)}
                  </span>
                </div>
              </>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="space-y-1">
              {client.activities.map((activity, i) => {
                const Icon = ACTIVITY_ICONS[activity.type];
                const colorClasses = ACTIVITY_COLORS[activity.type];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${colorClasses}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.date)} ({daysAgo(activity.date)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            onClick={() => {
              toast.success("Opening edit form...");
              onOpenChange(false);
            }}
          >
            <Edit className="h-4 w-4 mr-1.5" />
            Edit Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Add Client Dialog ---------- */

function AddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "",
    address: "",
    notes: "",
  });

  function handleSave() {
    if (!formData.businessName || !formData.contactPerson) {
      toast.error("Business name and contact person are required.");
      return;
    }
    toast.success(`Client "${formData.businessName}" added successfully!`);
    setFormData({
      businessName: "",
      contactPerson: "",
      email: "",
      phone: "",
      category: "",
      address: "",
      notes: "",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-red-400" />
            Add New Client
          </DialogTitle>
          <DialogDescription>
            Add a new client to the WCCG sales pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              placeholder="e.g. Fayetteville Auto Mall"
              value={formData.businessName}
              onChange={(e) =>
                setFormData({ ...formData, businessName: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                placeholder="Full name"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@business.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="(910) 555-0100"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Street address, Fayetteville, NC"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Initial notes about this client..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            onClick={handleSave}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Main Page ---------- */

export default function ClientProfilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "All">("All");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filteredClients = MOCK_CLIENTS.filter((client) => {
    const matchesSearch =
      searchQuery === "" ||
      client.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage =
      stageFilter === "All" || client.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  function openDetail(client: Client) {
    setSelectedClient(client);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Client Profiles
                </h1>
                <p className="text-white/50 mt-1">
                  WCCG 104.5 FM Sales CRM &mdash; Manage your advertising client relationships
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/advertise/portal"
                className="text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/[0.06] hover:border-white/[0.12]"
              >
                Dashboard
              </Link>
              <Link
                href="/advertise/portal/campaigns"
                className="text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/[0.06] hover:border-white/[0.12]"
              >
                Campaigns
              </Link>
              <Link
                href="/advertise/portal/billing"
                className="text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/[0.06] hover:border-white/[0.12]"
              >
                Billing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search clients by name, contact, category, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#141420] border-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <Select
          value={stageFilter}
          onValueChange={(v) => setStageFilter(v as PipelineStage | "All")}
        >
          <SelectTrigger className="w-full sm:w-44 bg-[#141420] border-white/[0.06] text-white">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Stages</SelectItem>
            <SelectItem value="Lead">Lead</SelectItem>
            <SelectItem value="Contacted">Contacted</SelectItem>
            <SelectItem value="Proposal">Proposal</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Closed Won">Closed Won</SelectItem>
            <SelectItem value="Closed Lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="bg-[#dc2626] text-white hover:bg-[#b91c1c] shrink-0"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Client
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Clients",
            value: "47",
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            subtitle: "+5 this month",
          },
          {
            label: "Active Campaigns",
            value: "23",
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            subtitle: "across 18 clients",
          },
          {
            label: "Pipeline Value",
            value: "$156,400",
            icon: DollarSign,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            subtitle: "monthly potential",
          },
          {
            label: "Avg Contract Value",
            value: "$3,280",
            icon: Briefcase,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            subtitle: "per month",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.06] bg-[#141420] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                {stat.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-white/30 mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Bar */}
      <PipelineBar clients={MOCK_CLIENTS} />

      {/* Client Table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="font-semibold text-white">Client Directory</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} shown
              {stageFilter !== "All" && ` in ${stageFilter}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white"
            onClick={() => {
              setSearchQuery("");
              setStageFilter("All");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
        </div>

        {filteredClients.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Search className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">No clients found.</p>
            <p className="text-xs text-white/30">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40">Client</TableHead>
                  <TableHead className="text-white/40 hidden md:table-cell">
                    Contact
                  </TableHead>
                  <TableHead className="text-white/40 hidden lg:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="text-white/40 hidden lg:table-cell">
                    Phone
                  </TableHead>
                  <TableHead className="text-white/40">Stage</TableHead>
                  <TableHead className="text-white/40 text-right">
                    Monthly
                  </TableHead>
                  <TableHead className="text-white/40 hidden sm:table-cell">
                    Last Contact
                  </TableHead>
                  <TableHead className="text-white/40 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="border-white/[0.06] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => openDetail(client)}
                  >
                    <TableCell>
                      <div>
                        <span className="text-white font-medium text-sm">
                          {client.businessName}
                        </span>
                        <span className="block text-[11px] text-white/30">
                          {client.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-white/60 text-sm">
                      {client.contactPerson}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-white/40 text-sm">
                      {client.email}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-white/40 text-sm">
                      {client.phone}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] border whitespace-nowrap ${STAGE_STYLES[client.stage]}`}
                      >
                        {client.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-white font-medium text-sm">
                      {formatCurrency(client.monthlySpend)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-white/40 text-sm">
                      <span title={formatDate(client.lastContact)}>
                        {daysAgo(client.lastContact)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-white/30 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(client);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-white/30 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info(
                              `Calling ${client.contactPerson} at ${client.phone}`
                            );
                          }}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-white/30 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info(
                              `Opening email to ${client.email}`
                            );
                          }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Star className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-white">Top Client</span>
          </div>
          <p className="text-lg font-bold text-white">Cape Fear Valley Health</p>
          <p className="text-xs text-white/40 mt-0.5">
            $5,200/mo &mdash; 3 active campaigns
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-white">Hottest Lead</span>
          </div>
          <p className="text-lg font-bold text-white">Cross Creek Barbershop</p>
          <p className="text-xs text-white/40 mt-0.5">
            Attended seminar &mdash; ready for proposal
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Calendar className="h-4 w-4 text-red-400" />
            </div>
            <span className="text-sm font-medium text-white">Upcoming Renewal</span>
          </div>
          <p className="text-lg font-bold text-white">Segra Stadium</p>
          <p className="text-xs text-white/40 mt-0.5">
            Contract expires Feb 28, 2026
          </p>
        </div>
      </div>

      {/* Portal Footer */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-white/50 text-sm">
          WCCG Sales CRM &mdash; Need help?{" "}
          <Link
            href="/contact"
            className="text-[#74ddc7] hover:underline"
          >
            Contact the sales team
          </Link>{" "}
          or call (910) 484-4932.
        </p>
      </div>

      {/* Dialogs */}
      {selectedClient && (
        <ClientDetailDialog
          client={selectedClient}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
