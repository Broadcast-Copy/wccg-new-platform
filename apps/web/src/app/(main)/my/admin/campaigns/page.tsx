"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Users,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Check,
  DollarSign,
  Calendar,
  Target,
  FileAudio,
  Eye,
  MousePointerClick,
  TrendingUp,
  Briefcase,
  Megaphone,
  Filter,
  MoreHorizontal,
  ArrowRight,
  Pause,
  Play,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignStatus = "Draft" | "Pending Review" | "Active" | "Paused" | "Completed";

interface Campaign {
  id: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  name: string;
  description: string;
  budget: number;
  dailyCap: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  geoTargets: string[];
  dayparts: string[];
  streams: string[];
  creativeFormats: { format: string; status: "Received" | "Pending from Client" }[];
  impressions: number;
  clicks: number;
  spend: number;
  createdAt: string;
}

interface Client {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  pipelineStage: string;
  totalSpend: number;
}

type TabId = "pipeline" | "wizard" | "clients" | "performance";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEO_OPTIONS = [
  "Durham",
  "Raleigh",
  "Chapel Hill",
  "Greensboro",
  "Winston-Salem",
  "Charlotte",
  "Fayetteville",
  "Wilmington",
  "Triad",
];

const DAYPART_OPTIONS = [
  "Morning Drive 6-10am",
  "Midday 10am-3pm",
  "Afternoon Drive 3-7pm",
  "Evening 7pm-12am",
  "Overnight 12-6am",
  "All Day",
];

const STREAM_OPTIONS = [
  "Main FM 104.5",
  "HD2 Urban",
  "HD3 Gospel",
  "Web Stream",
  "App Stream",
  "Podcast",
];

const CREATIVE_FORMATS = [
  "Audio :15",
  "Audio :30",
  "Audio :60",
  "Web Banner",
  "Sponsorship Tag",
];

const PIPELINE_COLUMNS: CampaignStatus[] = [
  "Draft",
  "Pending Review",
  "Active",
  "Paused",
  "Completed",
];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  Draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  "Pending Review": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Paused: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

function seedCampaigns(): Campaign[] {
  return [
    {
      id: "c1",
      clientId: "cl1",
      clientName: "Marcus Johnson",
      clientCompany: "Carolina BBQ Co",
      name: "Summer BBQ Promo",
      description: "Summer radio campaign promoting new menu items and catering services.",
      budget: 5000,
      dailyCap: 175,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      status: "Active",
      geoTargets: ["Durham", "Raleigh", "Chapel Hill"],
      dayparts: ["Morning Drive 6-10am", "Afternoon Drive 3-7pm"],
      streams: ["Main FM 104.5", "HD2 Urban"],
      creativeFormats: [
        { format: "Audio :30", status: "Received" },
        { format: "Audio :15", status: "Received" },
        { format: "Web Banner", status: "Pending from Client" },
      ],
      impressions: 142300,
      clicks: 3841,
      spend: 3200,
      createdAt: "2026-05-15",
    },
    {
      id: "c2",
      clientId: "cl2",
      clientName: "Tanya Williams",
      clientCompany: "Triangle Auto Group",
      name: "Spring Clearance Event",
      description: "Clearance event radio spots targeting Triangle area car buyers.",
      budget: 12000,
      dailyCap: 400,
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      status: "Active",
      geoTargets: ["Durham", "Raleigh", "Chapel Hill", "Greensboro"],
      dayparts: ["Morning Drive 6-10am", "Midday 10am-3pm", "Afternoon Drive 3-7pm"],
      streams: ["Main FM 104.5", "HD2 Urban", "Web Stream"],
      creativeFormats: [
        { format: "Audio :60", status: "Received" },
        { format: "Audio :30", status: "Received" },
        { format: "Sponsorship Tag", status: "Received" },
      ],
      impressions: 287500,
      clicks: 7210,
      spend: 8400,
      createdAt: "2026-03-20",
    },
    {
      id: "c3",
      clientId: "cl3",
      clientName: "Reverend Davis",
      clientCompany: "Grace Fellowship Church",
      name: "Easter Revival Week",
      description: "Easter revival event promotion targeting gospel listeners.",
      budget: 2500,
      dailyCap: 125,
      startDate: "2026-04-10",
      endDate: "2026-04-20",
      status: "Completed",
      geoTargets: ["Durham", "Raleigh", "Fayetteville"],
      dayparts: ["Morning Drive 6-10am", "Evening 7pm-12am"],
      streams: ["HD3 Gospel", "Main FM 104.5"],
      creativeFormats: [
        { format: "Audio :30", status: "Received" },
        { format: "Audio :15", status: "Received" },
      ],
      impressions: 98000,
      clicks: 2100,
      spend: 2500,
      createdAt: "2026-03-01",
    },
    {
      id: "c4",
      clientId: "cl4",
      clientName: "Keisha Brown",
      clientCompany: "Brown & Associates Law",
      name: "Know Your Rights Campaign",
      description: "Legal services awareness campaign.",
      budget: 8000,
      dailyCap: 275,
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      status: "Pending Review",
      geoTargets: ["Durham", "Raleigh", "Greensboro", "Charlotte"],
      dayparts: ["Midday 10am-3pm", "Afternoon Drive 3-7pm"],
      streams: ["Main FM 104.5", "HD2 Urban", "Podcast"],
      creativeFormats: [
        { format: "Audio :30", status: "Received" },
        { format: "Web Banner", status: "Pending from Client" },
        { format: "Sponsorship Tag", status: "Pending from Client" },
      ],
      impressions: 0,
      clicks: 0,
      spend: 0,
      createdAt: "2026-04-18",
    },
    {
      id: "c5",
      clientId: "cl5",
      clientName: "Derek Mitchell",
      clientCompany: "Triangle Fitness Club",
      name: "New Year Resolution Push",
      description: "January fitness membership drive targeting health-conscious listeners.",
      budget: 6500,
      dailyCap: 215,
      startDate: "2026-01-02",
      endDate: "2026-01-31",
      status: "Completed",
      geoTargets: ["Durham", "Raleigh", "Chapel Hill"],
      dayparts: ["Morning Drive 6-10am", "All Day"],
      streams: ["Main FM 104.5", "App Stream", "Web Stream"],
      creativeFormats: [
        { format: "Audio :30", status: "Received" },
        { format: "Audio :15", status: "Received" },
        { format: "Web Banner", status: "Received" },
      ],
      impressions: 210000,
      clicks: 5600,
      spend: 6500,
      createdAt: "2025-12-15",
    },
    {
      id: "c6",
      clientId: "cl6",
      clientName: "Pamela Owens",
      clientCompany: "Soul Food Kitchen",
      name: "Grand Opening Blitz",
      description: "Restaurant grand opening awareness campaign.",
      budget: 3000,
      dailyCap: 200,
      startDate: "2026-03-15",
      endDate: "2026-03-30",
      status: "Draft",
      geoTargets: ["Durham", "Raleigh"],
      dayparts: ["Midday 10am-3pm", "Evening 7pm-12am"],
      streams: ["Main FM 104.5", "HD2 Urban"],
      creativeFormats: [
        { format: "Audio :30", status: "Pending from Client" },
        { format: "Audio :15", status: "Pending from Client" },
      ],
      impressions: 0,
      clicks: 0,
      spend: 0,
      createdAt: "2026-03-01",
    },
    {
      id: "c7",
      clientId: "cl2",
      clientName: "Tanya Williams",
      clientCompany: "Triangle Auto Group",
      name: "Memorial Day Weekend Sale",
      description: "Memorial Day blowout sale with aggressive radio spots.",
      budget: 15000,
      dailyCap: 1000,
      startDate: "2026-05-22",
      endDate: "2026-05-27",
      status: "Paused",
      geoTargets: ["Durham", "Raleigh", "Greensboro", "Winston-Salem", "Charlotte"],
      dayparts: ["Morning Drive 6-10am", "Midday 10am-3pm", "Afternoon Drive 3-7pm", "Evening 7pm-12am"],
      streams: ["Main FM 104.5", "HD2 Urban", "Web Stream", "App Stream"],
      creativeFormats: [
        { format: "Audio :60", status: "Received" },
        { format: "Audio :30", status: "Received" },
        { format: "Web Banner", status: "Received" },
        { format: "Sponsorship Tag", status: "Received" },
      ],
      impressions: 85000,
      clicks: 2300,
      spend: 5200,
      createdAt: "2026-04-28",
    },
    {
      id: "c8",
      clientId: "cl1",
      clientName: "Marcus Johnson",
      clientCompany: "Carolina BBQ Co",
      name: "Fourth of July Cookout Special",
      description: "Independence Day catering and party pack promotion.",
      budget: 4000,
      dailyCap: 200,
      startDate: "2026-06-20",
      endDate: "2026-07-05",
      status: "Draft",
      geoTargets: ["Durham", "Raleigh", "Chapel Hill", "Greensboro"],
      dayparts: ["All Day"],
      streams: ["Main FM 104.5", "HD2 Urban", "Web Stream"],
      creativeFormats: [
        { format: "Audio :30", status: "Pending from Client" },
        { format: "Audio :15", status: "Pending from Client" },
        { format: "Web Banner", status: "Pending from Client" },
      ],
      impressions: 0,
      clicks: 0,
      spend: 0,
      createdAt: "2026-05-28",
    },
  ];
}

function seedClients(): Client[] {
  return [
    {
      id: "cl1",
      company: "Carolina BBQ Co",
      contactName: "Marcus Johnson",
      email: "marcus@carolinabbq.com",
      phone: "(919) 555-0142",
      pipelineStage: "Active Client",
      totalSpend: 9000,
    },
    {
      id: "cl2",
      company: "Triangle Auto Group",
      contactName: "Tanya Williams",
      email: "twilliams@triangleauto.com",
      phone: "(919) 555-0298",
      pipelineStage: "Active Client",
      totalSpend: 27000,
    },
    {
      id: "cl3",
      company: "Grace Fellowship Church",
      contactName: "Reverend Davis",
      email: "rev.davis@gracefellowship.org",
      phone: "(919) 555-0187",
      pipelineStage: "Past Client",
      totalSpend: 2500,
    },
    {
      id: "cl4",
      company: "Brown & Associates Law",
      contactName: "Keisha Brown",
      email: "keisha@brownlawfirm.com",
      phone: "(919) 555-0356",
      pipelineStage: "Prospect",
      totalSpend: 0,
    },
    {
      id: "cl5",
      company: "Triangle Fitness Club",
      contactName: "Derek Mitchell",
      email: "derek@trianglefitness.com",
      phone: "(919) 555-0411",
      pipelineStage: "Past Client",
      totalSpend: 6500,
    },
    {
      id: "cl6",
      company: "Soul Food Kitchen",
      contactName: "Pamela Owens",
      email: "pamela@soulfoodkitchen.com",
      phone: "(919) 555-0523",
      pipelineStage: "New Lead",
      totalSpend: 0,
    },
  ];
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadFromStorage<T>(key: string, seeder: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  const data = seeder();
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
  return data;
}

function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Wizard form state shape
// ---------------------------------------------------------------------------

interface WizardState {
  // Step 1 - Client
  clientId: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  isNewClient: boolean;
  // Step 2 - Details
  campaignName: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: string;
  dailyCap: string;
  // Step 3 - Targeting
  geoTargets: string[];
  dayparts: string[];
  streams: string[];
  // Step 4 - Creative
  creativeFormats: { format: string; status: "Received" | "Pending from Client" }[];
}

function emptyWizard(): WizardState {
  return {
    clientId: "",
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    isNewClient: false,
    campaignName: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
    dailyCap: "",
    geoTargets: [],
    dayparts: [],
    streams: [],
    creativeFormats: [],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CampaignBuilderPage() {
  // ---- State ----
  const [activeTab, setActiveTab] = useState<TabId>("pipeline");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Pipeline
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Wizard
  const [wizardStep, setWizardStep] = useState(0);
  const [wizard, setWizard] = useState<WizardState>(emptyWizard);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Clients tab
  const [clientsSearch, setClientsSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ company: "", contactName: "", email: "", phone: "" });

  // ---- Load from localStorage ----
  useEffect(() => {
    setCampaigns(loadFromStorage("wccg_campaigns", seedCampaigns));
    setClients(loadFromStorage("wccg_ad_clients", seedClients));
    setLoaded(true);
  }, []);

  // ---- Persist on change ----
  useEffect(() => {
    if (loaded) saveToStorage("wccg_campaigns", campaigns);
  }, [campaigns, loaded]);

  useEffect(() => {
    if (loaded) saveToStorage("wccg_ad_clients", clients);
  }, [clients, loaded]);

  // ---- Helpers ----
  const fmt = (n: number) => n.toLocaleString("en-US");
  const fmtCurrency = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const generateId = () => `c${Date.now().toString(36)}`;

  // ---- Wizard submit ----
  const handleWizardSubmit = useCallback(() => {
    const campaignData: Campaign = {
      id: editingCampaignId || generateId(),
      clientId: wizard.clientId || generateId(),
      clientName: wizard.clientName,
      clientCompany: wizard.clientCompany,
      name: wizard.campaignName,
      description: wizard.description,
      budget: Number(wizard.budget) || 0,
      dailyCap: Number(wizard.dailyCap) || 0,
      startDate: wizard.startDate,
      endDate: wizard.endDate,
      status: "Draft",
      geoTargets: wizard.geoTargets,
      dayparts: wizard.dayparts,
      streams: wizard.streams,
      creativeFormats: wizard.creativeFormats,
      impressions: 0,
      clicks: 0,
      spend: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setCampaigns((prev) => {
      if (editingCampaignId) {
        return prev.map((c) => (c.id === editingCampaignId ? { ...c, ...campaignData, status: c.status } : c));
      }
      return [...prev, campaignData];
    });

    // If new client, add to client list
    if (wizard.isNewClient && wizard.clientCompany) {
      const newCl: Client = {
        id: wizard.clientId || generateId(),
        company: wizard.clientCompany,
        contactName: wizard.clientName,
        email: wizard.clientEmail,
        phone: wizard.clientPhone,
        pipelineStage: "New Lead",
        totalSpend: 0,
      };
      setClients((prev) => [...prev, newCl]);
    }

    toast.success(editingCampaignId ? "Campaign updated!" : "Campaign created!", {
      description: `"${wizard.campaignName}" saved as Draft.`,
    });

    setWizard(emptyWizard());
    setWizardStep(0);
    setEditingCampaignId(null);
    setActiveTab("pipeline");
  }, [wizard, editingCampaignId]);

  // ---- Open edit wizard ----
  const openEditWizard = useCallback(
    (c: Campaign) => {
      setEditingCampaignId(c.id);
      setWizard({
        clientId: c.clientId,
        clientName: c.clientName,
        clientCompany: c.clientCompany,
        clientEmail: "",
        clientPhone: "",
        isNewClient: false,
        campaignName: c.name,
        description: c.description,
        startDate: c.startDate,
        endDate: c.endDate,
        budget: String(c.budget),
        dailyCap: String(c.dailyCap),
        geoTargets: c.geoTargets,
        dayparts: c.dayparts,
        streams: c.streams,
        creativeFormats: c.creativeFormats,
      });
      setWizardStep(0);
      setActiveTab("wizard");
      setSelectedCampaign(null);
    },
    [],
  );

  // ---- Performance data ----
  const perfData = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "Active" || c.status === "Completed" || c.status === "Paused");
    const totalImpressions = active.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = active.reduce((s, c) => s + c.clicks, 0);
    const totalSpend = active.reduce((s, c) => s + c.spend, 0);
    const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
    return { active, totalImpressions, totalClicks, totalSpend, avgCtr };
  }, [campaigns]);

  // ---- Filtered clients ----
  const filteredClients = useMemo(() => {
    if (!clientsSearch.trim()) return clients;
    const q = clientsSearch.toLowerCase();
    return clients.filter(
      (c) => c.company.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q),
    );
  }, [clients, clientsSearch]);

  // ---- Filtered pipeline ----
  const filteredCampaigns = useMemo(() => {
    if (!pipelineSearch.trim()) return campaigns;
    const q = pipelineSearch.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.clientCompany.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q),
    );
  }, [campaigns, pipelineSearch]);

  // ---- Wizard client search ----
  const wizardClientResults = useMemo(() => {
    if (!clientSearch.trim()) return [];
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) => c.company.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q),
    );
  }, [clients, clientSearch]);

  // ---- Don't render until hydrated ----
  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#74ddc7] border-t-transparent" />
      </div>
    );
  }

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7401df]/10 border border-[#7401df]/20">
            <Megaphone className="h-7 w-7 text-[#7401df]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campaign Builder</h1>
            <p className="text-sm text-muted-foreground">Sales Agent Dashboard</p>
          </div>
        </div>
        <span className="rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#dc2626]">
          Admin
        </span>
      </div>

      {/* ---- Tab Navigation ---- */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "pipeline" as TabId, label: "Pipeline", icon: LayoutGrid },
            { id: "wizard" as TabId, label: "New Campaign", icon: Plus },
            { id: "clients" as TabId, label: "Clients", icon: Users },
            { id: "performance" as TabId, label: "Performance", icon: BarChart3 },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (tab.id === "wizard" && activeTab !== "wizard") {
                setWizard(emptyWizard());
                setWizardStep(0);
                setEditingCampaignId(null);
              }
              setActiveTab(tab.id);
            }}
            className={
              activeTab === tab.id
                ? "bg-[#7401df] hover:bg-[#7401df]/90 text-white"
                : ""
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: PIPELINE VIEW                                              */}
      {/* ================================================================= */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {/* Pipeline header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              className="bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-black font-semibold"
              onClick={() => {
                setWizard(emptyWizard());
                setWizardStep(0);
                setEditingCampaignId(null);
                setActiveTab("wizard");
              }}
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {PIPELINE_COLUMNS.map((col) => {
              const colCampaigns = filteredCampaigns.filter((c) => c.status === col);
              return (
                <div key={col} className="space-y-3">
                  {/* Column header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[col]}`}
                      >
                        {col}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{colCampaigns.length}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[120px]">
                    {colCampaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign)}
                        className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-[#74ddc7]/40 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 transition-all group"
                      >
                        <p className="text-xs text-muted-foreground font-medium truncate">
                          {campaign.clientCompany}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-1 group-hover:text-[#74ddc7] transition-colors truncate">
                          {campaign.name}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {fmt(campaign.budget)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {campaign.startDate.slice(5)}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[campaign.status]}`}
                          >
                            {campaign.status}
                          </span>
                        </div>
                      </button>
                    ))}
                    {colCampaigns.length === 0 && (
                      <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-6 text-xs text-muted-foreground">
                        No campaigns
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Campaign Detail Modal ---- */}
          {selectedCampaign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedCampaign(null)}>
              <div
                className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{selectedCampaign.clientCompany}</p>
                      <h3 className="text-lg font-bold text-foreground mt-1">{selectedCampaign.name}</h3>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[selectedCampaign.status]}`}
                    >
                      {selectedCampaign.status}
                    </span>
                  </div>

                  {selectedCampaign.description && (
                    <p className="text-sm text-muted-foreground">{selectedCampaign.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget</p>
                      <p className="text-lg font-bold text-[#74ddc7]">{fmtCurrency(selectedCampaign.budget)}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Spent</p>
                      <p className="text-lg font-bold text-foreground">{fmtCurrency(selectedCampaign.spend)}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Start</p>
                      <p className="text-sm font-semibold text-foreground">{selectedCampaign.startDate}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">End</p>
                      <p className="text-sm font-semibold text-foreground">{selectedCampaign.endDate}</p>
                    </div>
                  </div>

                  {selectedCampaign.geoTargets.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Geographic Targets</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCampaign.geoTargets.map((g) => (
                          <span key={g} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCampaign.dayparts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Dayparts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCampaign.dayparts.map((d) => (
                          <span key={d} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCampaign.streams.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Streams</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCampaign.streams.map((s) => (
                          <span key={s} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCampaign.creativeFormats.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Creative Formats</p>
                      <div className="space-y-1">
                        {selectedCampaign.creativeFormats.map((cf) => (
                          <div key={cf.format} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{cf.format}</span>
                            <span
                              className={
                                cf.status === "Received"
                                  ? "text-emerald-400 font-medium"
                                  : "text-amber-400 font-medium"
                              }
                            >
                              {cf.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedCampaign.impressions > 0 || selectedCampaign.clicks > 0) && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Impressions</p>
                        <p className="text-sm font-bold text-foreground">{fmt(selectedCampaign.impressions)}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Clicks</p>
                        <p className="text-sm font-bold text-foreground">{fmt(selectedCampaign.clicks)}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">CTR</p>
                        <p className="text-sm font-bold text-foreground">
                          {selectedCampaign.impressions > 0
                            ? ((selectedCampaign.clicks / selectedCampaign.impressions) * 100).toFixed(2)
                            : "0.00"}
                          %
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      className="bg-[#7401df] hover:bg-[#7401df]/90 text-white flex-1"
                      onClick={() => openEditWizard(selectedCampaign)}
                    >
                      Edit Campaign
                    </Button>
                    {selectedCampaign.status === "Active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        onClick={() => {
                          setCampaigns((prev) =>
                            prev.map((c) => (c.id === selectedCampaign.id ? { ...c, status: "Paused" } : c)),
                          );
                          setSelectedCampaign((p) => (p ? { ...p, status: "Paused" } : null));
                          toast.info("Campaign paused.");
                        }}
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    {selectedCampaign.status === "Paused" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => {
                          setCampaigns((prev) =>
                            prev.map((c) => (c.id === selectedCampaign.id ? { ...c, status: "Active" } : c)),
                          );
                          setSelectedCampaign((p) => (p ? { ...p, status: "Active" } : null));
                          toast.success("Campaign resumed.");
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    )}
                    {selectedCampaign.status === "Draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => {
                          setCampaigns((prev) =>
                            prev.map((c) =>
                              c.id === selectedCampaign.id ? { ...c, status: "Pending Review" } : c,
                            ),
                          );
                          setSelectedCampaign((p) => (p ? { ...p, status: "Pending Review" } : null));
                          toast.success("Campaign submitted for review.");
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Submit
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setSelectedCampaign(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: CAMPAIGN WIZARD                                            */}
      {/* ================================================================= */}
      {activeTab === "wizard" && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {["Client", "Details", "Targeting", "Creative", "Review"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  onClick={() => setWizardStep(i)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    i === wizardStep
                      ? "bg-[#7401df] text-white"
                      : i < wizardStep
                        ? "bg-[#74ddc7] text-black"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < wizardStep ? <Check className="h-4 w-4" /> : i + 1}
                </button>
                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    i === wizardStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {i < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:inline" />}
              </div>
            ))}
          </div>

          {/* Step content card */}
          <div className="rounded-xl border border-border bg-card p-6">
            {/* Step 0: Client */}
            {wizardStep === 0 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#7401df]" />
                    Client Information
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search for an existing client or add a new one.
                  </p>
                </div>

                {!wizard.isNewClient && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search clients by name or company..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {wizardClientResults.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border p-2">
                        {wizardClientResults.map((cl) => (
                          <button
                            key={cl.id}
                            onClick={() => {
                              setWizard((p) => ({
                                ...p,
                                clientId: cl.id,
                                clientName: cl.contactName,
                                clientCompany: cl.company,
                                clientEmail: cl.email,
                                clientPhone: cl.phone,
                                isNewClient: false,
                              }));
                              setClientSearch("");
                            }}
                            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{cl.company}</p>
                              <p className="text-xs text-muted-foreground">{cl.contactName}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                    {wizard.clientCompany && (
                      <div className="rounded-lg border border-[#74ddc7]/30 bg-[#74ddc7]/5 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{wizard.clientCompany}</p>
                          <p className="text-xs text-muted-foreground">{wizard.clientName}</p>
                        </div>
                        <Badge variant="outline" className="border-[#74ddc7]/40 text-[#74ddc7]">
                          Selected
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWizard((p) => ({
                          ...p,
                          isNewClient: true,
                          clientId: "",
                          clientName: "",
                          clientCompany: "",
                          clientEmail: "",
                          clientPhone: "",
                        }));
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add New Client
                    </Button>
                  </div>
                )}

                {wizard.isNewClient && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">New Client</p>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setWizard((p) => ({ ...p, isNewClient: false }))}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                        <Input
                          value={wizard.clientCompany}
                          onChange={(e) => setWizard((p) => ({ ...p, clientCompany: e.target.value }))}
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Contact Name</label>
                        <Input
                          value={wizard.clientName}
                          onChange={(e) => setWizard((p) => ({ ...p, clientName: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Email</label>
                        <Input
                          type="email"
                          value={wizard.clientEmail}
                          onChange={(e) => setWizard((p) => ({ ...p, clientEmail: e.target.value }))}
                          placeholder="john@acme.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Phone</label>
                        <Input
                          value={wizard.clientPhone}
                          onChange={(e) => setWizard((p) => ({ ...p, clientPhone: e.target.value }))}
                          placeholder="(919) 555-0000"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Campaign Details */}
            {wizardStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#7401df]" />
                    Campaign Details
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set the campaign name, schedule, and budget.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Campaign Name</label>
                    <Input
                      value={wizard.campaignName}
                      onChange={(e) => setWizard((p) => ({ ...p, campaignName: e.target.value }))}
                      placeholder="Summer BBQ Promo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <textarea
                      value={wizard.description}
                      onChange={(e) => setWizard((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description of campaign goals..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none dark:bg-input/30"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                      <Input
                        type="date"
                        value={wizard.startDate}
                        onChange={(e) => setWizard((p) => ({ ...p, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">End Date</label>
                      <Input
                        type="date"
                        value={wizard.endDate}
                        onChange={(e) => setWizard((p) => ({ ...p, endDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Total Budget ($)</label>
                      <Input
                        type="number"
                        value={wizard.budget}
                        onChange={(e) => setWizard((p) => ({ ...p, budget: e.target.value }))}
                        placeholder="5000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Daily Cap ($)</label>
                      <Input
                        type="number"
                        value={wizard.dailyCap}
                        onChange={(e) => setWizard((p) => ({ ...p, dailyCap: e.target.value }))}
                        placeholder="175"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Targeting */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#7401df]" />
                    Targeting
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select geographic areas, dayparts, and streams.
                  </p>
                </div>

                {/* Geo Targets */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Geographic Areas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GEO_OPTIONS.map((geo) => {
                      const active = wizard.geoTargets.includes(geo);
                      return (
                        <button
                          key={geo}
                          onClick={() =>
                            setWizard((p) => ({
                              ...p,
                              geoTargets: active
                                ? p.geoTargets.filter((g) => g !== geo)
                                : [...p.geoTargets, geo],
                            }))
                          }
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                            active
                              ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-input"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              active
                                ? "border-[#74ddc7] bg-[#74ddc7]"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {active && <Check className="h-3 w-3 text-black" />}
                          </div>
                          {geo}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dayparts */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Dayparts</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DAYPART_OPTIONS.map((dp) => {
                      const active = wizard.dayparts.includes(dp);
                      return (
                        <button
                          key={dp}
                          onClick={() =>
                            setWizard((p) => ({
                              ...p,
                              dayparts: active
                                ? p.dayparts.filter((d) => d !== dp)
                                : [...p.dayparts, dp],
                            }))
                          }
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                            active
                              ? "border-[#7401df]/50 bg-[#7401df]/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-input"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              active
                                ? "border-[#7401df] bg-[#7401df]"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {active && <Check className="h-3 w-3 text-white" />}
                          </div>
                          {dp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Streams */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Streams</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STREAM_OPTIONS.map((st) => {
                      const active = wizard.streams.includes(st);
                      return (
                        <button
                          key={st}
                          onClick={() =>
                            setWizard((p) => ({
                              ...p,
                              streams: active
                                ? p.streams.filter((s) => s !== st)
                                : [...p.streams, st],
                            }))
                          }
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                            active
                              ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-input"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              active
                                ? "border-[#74ddc7] bg-[#74ddc7]"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {active && <Check className="h-3 w-3 text-black" />}
                          </div>
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Creative Specs */}
            {wizardStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileAudio className="h-5 w-5 text-[#7401df]" />
                    Creative Specs
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select required ad formats and mark their delivery status.
                  </p>
                </div>
                <div className="space-y-3">
                  {CREATIVE_FORMATS.map((format) => {
                    const existing = wizard.creativeFormats.find((cf) => cf.format === format);
                    const isSelected = !!existing;
                    return (
                      <div
                        key={format}
                        className={`rounded-lg border px-4 py-3 transition-all ${
                          isSelected ? "border-[#7401df]/30 bg-[#7401df]/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setWizard((p) => ({
                                ...p,
                                creativeFormats: isSelected
                                  ? p.creativeFormats.filter((cf) => cf.format !== format)
                                  : [...p.creativeFormats, { format, status: "Pending from Client" }],
                              }));
                            }}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                isSelected
                                  ? "border-[#7401df] bg-[#7401df]"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                              {format}
                            </span>
                          </button>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setWizard((p) => ({
                                    ...p,
                                    creativeFormats: p.creativeFormats.map((cf) =>
                                      cf.format === format ? { ...cf, status: "Received" } : cf,
                                    ),
                                  }))
                                }
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  existing?.status === "Received"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : "border-border text-muted-foreground hover:border-emerald-500/30"
                                }`}
                              >
                                Received
                              </button>
                              <button
                                onClick={() =>
                                  setWizard((p) => ({
                                    ...p,
                                    creativeFormats: p.creativeFormats.map((cf) =>
                                      cf.format === format ? { ...cf, status: "Pending from Client" } : cf,
                                    ),
                                  }))
                                }
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  existing?.status === "Pending from Client"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                    : "border-border text-muted-foreground hover:border-amber-500/30"
                                }`}
                              >
                                Pending
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {wizardStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Eye className="h-5 w-5 text-[#7401df]" />
                    Review &amp; Submit
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review your campaign before saving.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Client */}
                  <div className="rounded-lg border border-border p-4 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Client</p>
                    <p className="text-sm font-semibold text-foreground">{wizard.clientCompany || "Not set"}</p>
                    <p className="text-xs text-muted-foreground">{wizard.clientName}</p>
                  </div>

                  {/* Campaign */}
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Campaign</p>
                    <p className="text-sm font-semibold text-foreground">{wizard.campaignName || "Not set"}</p>
                    {wizard.description && (
                      <p className="text-xs text-muted-foreground">{wizard.description}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Start</p>
                        <p className="text-xs font-medium text-foreground">{wizard.startDate || "--"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">End</p>
                        <p className="text-xs font-medium text-foreground">{wizard.endDate || "--"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Budget</p>
                        <p className="text-xs font-medium text-foreground">
                          {wizard.budget ? fmtCurrency(Number(wizard.budget)) : "--"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Daily Cap</p>
                        <p className="text-xs font-medium text-foreground">
                          {wizard.dailyCap ? fmtCurrency(Number(wizard.dailyCap)) : "--"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Targeting */}
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Targeting</p>
                    {wizard.geoTargets.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Areas</p>
                        <div className="flex flex-wrap gap-1">
                          {wizard.geoTargets.map((g) => (
                            <span key={g} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {wizard.dayparts.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Dayparts</p>
                        <div className="flex flex-wrap gap-1">
                          {wizard.dayparts.map((d) => (
                            <span key={d} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {wizard.streams.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Streams</p>
                        <div className="flex flex-wrap gap-1">
                          {wizard.streams.map((s) => (
                            <span key={s} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {wizard.geoTargets.length === 0 && wizard.dayparts.length === 0 && wizard.streams.length === 0 && (
                      <p className="text-xs text-muted-foreground">No targeting selected</p>
                    )}
                  </div>

                  {/* Creative */}
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Creative Formats</p>
                    {wizard.creativeFormats.length > 0 ? (
                      <div className="space-y-1">
                        {wizard.creativeFormats.map((cf) => (
                          <div key={cf.format} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{cf.format}</span>
                            <span
                              className={
                                cf.status === "Received"
                                  ? "text-emerald-400 font-medium"
                                  : "text-amber-400 font-medium"
                              }
                            >
                              {cf.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No formats selected</p>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-black font-semibold"
                  onClick={handleWizardSubmit}
                >
                  <Check className="h-4 w-4" />
                  {editingCampaignId ? "Update Campaign" : "Create Campaign"}
                </Button>
              </div>
            )}

            {/* Wizard navigation */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={wizardStep === 0}
                onClick={() => setWizardStep((s) => s - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {wizardStep < 4 && (
                <Button
                  size="sm"
                  className="bg-[#7401df] hover:bg-[#7401df]/90 text-white"
                  onClick={() => setWizardStep((s) => s + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: CLIENTS                                                    */}
      {/* ================================================================= */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={clientsSearch}
                onChange={(e) => setClientsSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              className="bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-black font-semibold"
              onClick={() => setShowAddClient((p) => !p)}
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>

          {/* Add Client Form */}
          {showAddClient && (
            <div className="rounded-xl border border-[#74ddc7]/30 bg-[#74ddc7]/5 p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">New Client</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Company</label>
                  <Input
                    value={newClient.company}
                    onChange={(e) => setNewClient((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contact Name</label>
                  <Input
                    value={newClient.contactName}
                    onChange={(e) => setNewClient((p) => ({ ...p, contactName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                    placeholder="john@acme.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input
                    value={newClient.phone}
                    onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(919) 555-0000"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-black font-semibold"
                  onClick={() => {
                    if (!newClient.company.trim()) {
                      toast.error("Company name is required.");
                      return;
                    }
                    const cl: Client = {
                      id: `cl${Date.now().toString(36)}`,
                      company: newClient.company,
                      contactName: newClient.contactName,
                      email: newClient.email,
                      phone: newClient.phone,
                      pipelineStage: "New Lead",
                      totalSpend: 0,
                    };
                    setClients((prev) => [...prev, cl]);
                    setNewClient({ company: "", contactName: "", email: "", phone: "" });
                    setShowAddClient(false);
                    toast.success("Client added!", { description: cl.company });
                  }}
                >
                  <Check className="h-4 w-4" />
                  Save Client
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddClient(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Client Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden sm:table-cell">
                      Contact
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden lg:table-cell">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Stage
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Total Spend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((cl) => {
                    const clientCampaigns = campaigns.filter((c) => c.clientId === cl.id);
                    const isExpanded = expandedClient === cl.id;
                    return (
                      <Fragment key={cl.id}>
                        <tr
                          onClick={() => setExpandedClient(isExpanded ? null : cl.id)}
                          className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-foreground">{cl.company}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{cl.contactName}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {cl.email}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {cl.phone}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                cl.pipelineStage === "Active Client"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : cl.pipelineStage === "Past Client"
                                    ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                    : cl.pipelineStage === "Prospect"
                                      ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                      : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
                              }`}
                            >
                              {cl.pipelineStage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">
                            {fmtCurrency(cl.totalSpend)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-muted/10">
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-foreground">Campaign History</p>
                                {clientCampaigns.length > 0 ? (
                                  <div className="space-y-2">
                                    {clientCampaigns.map((camp) => (
                                      <div
                                        key={camp.id}
                                        className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                                      >
                                        <div>
                                          <p className="text-sm font-medium text-foreground">{camp.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {camp.startDate} - {camp.endDate}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-medium text-foreground">
                                            {fmtCurrency(camp.budget)}
                                          </span>
                                          <span
                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[camp.status]}`}
                                          >
                                            {camp.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No campaigns yet.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No clients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: PERFORMANCE                                                */}
      {/* ================================================================= */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-[#74ddc7]" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total Impressions
                </p>
              </div>
              <p className="text-2xl font-bold text-[#74ddc7]">{fmt(perfData.totalImpressions)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-[#7401df]" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total Clicks
                </p>
              </div>
              <p className="text-2xl font-bold text-[#7401df]">{fmt(perfData.totalClicks)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Average CTR
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{perfData.avgCtr}%</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-[#dc2626]" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total Spend
                </p>
              </div>
              <p className="text-2xl font-bold text-[#dc2626]">{fmtCurrency(perfData.totalSpend)}</p>
            </div>
          </div>

          {/* Performance Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Campaign
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden sm:table-cell">
                      Client
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Impressions
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">
                      Clicks
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">
                      CTR
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Spend
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden lg:table-cell">
                      Budget
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden lg:table-cell">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {perfData.active.map((c) => {
                    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
                    const progress = c.budget > 0 ? Math.min(100, Math.round((c.spend / c.budget) * 100)) : 0;
                    return (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{c.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[c.status]}`}
                              >
                                {c.status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.clientCompany}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{fmt(c.impressions)}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground hidden md:table-cell">
                          {fmt(c.clicks)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground hidden md:table-cell">
                          {ctr}%
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{fmtCurrency(c.spend)}</td>
                        <td className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">
                          {fmtCurrency(c.budget)}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor:
                                    progress >= 90 ? "#dc2626" : progress >= 70 ? "#f59e0b" : "#74ddc7",
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                              {progress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {perfData.active.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No campaign performance data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
