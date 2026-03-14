"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Radio,
  Wrench,
  AlertTriangle,
  Briefcase,
  Calendar,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SOPDocument {
  id: string;
  title: string;
  category: "On-Air" | "Technical" | "Emergency" | "Administrative";
  version: string;
  lastReviewed: string;
  reviewer: string;
  status: "Current" | "Review Due" | "Archived";
  content: string;
  sections: string[];
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_SOPS: SOPDocument[] = [
  {
    id: "sop1",
    title: "Station Sign-On / Sign-Off Procedures",
    category: "On-Air",
    version: "3.1",
    lastReviewed: "2026-02-15",
    reviewer: "Keisha Williams",
    status: "Current",
    sections: ["Pre-Sign-On Checklist", "Legal ID Requirements", "EAS Check", "Transmitter Verification", "Sign-Off Sequence"],
    content: `WCCG 104.5 FM — Station Sign-On / Sign-Off Procedures\n\n1. PRE-SIGN-ON CHECKLIST\n- Verify transmitter is operational (check remote control readings)\n- Confirm audio processing chain is active (Orban 8700i green indicators)\n- Verify EAS unit is online and receiving alerts (DASDEC-II status page)\n- Check automation system (Zetta) — verify scheduled playlist is loaded\n- Confirm STL link is active (primary microwave or T1 backup)\n- Test studio monitors and headphone feeds\n\n2. LEGAL ID REQUIREMENTS\n- FCC requires station identification at the top of each hour\n- Format: "WCCG Fayetteville" (call letters + city of license)\n- Must air as close to the top of the hour as possible\n- Automated in Zetta — verify clock includes legal ID\n\n3. EAS CHECK\n- Verify DASDEC-II unit shows "READY" status\n- Confirm CAP server connection is active\n- Check that weekly test (RWT) schedule is programmed\n- Review any pending alerts\n\n4. TRANSMITTER VERIFICATION\n- Power output: 25 kW (within 5% tolerance = 23.75–26.25 kW)\n- Frequency: 104.5 MHz (within FCC tolerance)\n- VSWR: Below 1.5:1\n- PA temperature: Below 165°F\n- If any readings are out of spec, contact Chief Engineer immediately\n\n5. SIGN-OFF SEQUENCE\n- Air final legal ID\n- Run sign-off announcement (pre-recorded)\n- Reduce transmitter to low power if applicable\n- Secure studios and log sign-off time`,
  },
  {
    id: "sop2",
    title: "Emergency Broadcast Procedures (EAS)",
    category: "Emergency",
    version: "4.0",
    lastReviewed: "2026-03-01",
    reviewer: "James Carter",
    status: "Current",
    sections: ["Alert Categories", "Auto-Forward Alerts", "Manual Alert Procedures", "Post-Alert Logging", "Equipment Failure Protocol"],
    content: `WCCG 104.5 FM — Emergency Alert System (EAS) Procedures\n\n1. ALERT CATEGORIES\n- REQUIRED FORWARDING: EAN (Emergency Action Notification), NPT (National Periodic Test)\n- STATE/LOCAL REQUIRED: TOR (Tornado Warning), SVR (Severe Thunderstorm Warning), FFW (Flash Flood Warning), AMB (AMBER Alert)\n- VOLUNTARY: All other weather alerts per station discretion\n\n2. AUTO-FORWARD ALERTS\nThe DASDEC-II is configured to automatically forward:\n- All EAN alerts (interrupt programming immediately)\n- TOR, SVR, FFW for Cumberland, Hoke, Robeson, Sampson, Harnett, Bladen counties\n- AMBER Alerts for State of North Carolina\n- All NPT (National Periodic Tests)\n\n3. MANUAL ALERT PROCEDURES\nIf auto-forward fails:\n- Access DASDEC-II web interface at 192.168.1.50\n- Navigate to "Send Alert" tab\n- Select appropriate alert type and originator\n- Verify county codes and duration\n- Click "Send" — alert will interrupt programming\n- If DASDEC is unresponsive, use backup encoder (rack position 3B)\n\n4. POST-ALERT LOGGING\n- All alerts are auto-logged by DASDEC\n- Verify log entry within 1 hour of alert\n- For live alerts: note time, duration, operator on duty\n- Retain logs for minimum 2 years per FCC rules\n\n5. EQUIPMENT FAILURE PROTOCOL\n- If DASDEC-II fails: switch to backup encoder, contact Chief Engineer\n- If all EAS equipment fails: manually read alert text on-air\n- Document all equipment failures and report to Chief Engineer within 1 hour`,
  },
  {
    id: "sop3",
    title: "Transmitter Site Procedures",
    category: "Technical",
    version: "2.5",
    lastReviewed: "2026-01-20",
    reviewer: "James Carter",
    status: "Current",
    sections: ["Site Access", "Safety Protocols", "Routine Inspections", "Emergency Switchover", "RF Safety"],
    content: `WCCG 104.5 FM — Transmitter Site Procedures (Bunce Rd Tower)\n\n1. SITE ACCESS\n- Gate code: Contact Chief Engineer for current code\n- Sign in/out log required for all visits\n- Two-person rule for tower climbing\n- Notify Operations Manager before and after site visits\n\n2. SAFETY PROTOCOLS\n- RF exposure: Do not approach antenna elements when transmitter is at full power\n- Tower climbing requires certified climber with fall protection\n- Generator room: hearing protection required when running\n- Fire extinguisher locations: entrance, generator room, transmitter room\n\n3. ROUTINE INSPECTIONS (Monthly)\n- Check transmitter readings (power, VSWR, PA temp, reflected power)\n- Inspect antenna and transmission line connections\n- Test generator start and run for 30 minutes under load\n- Check fuel level — maintain above 75%\n- Inspect tower lights — verify operation and report outages within 15 minutes\n- Check building HVAC — clean filters if needed\n- Verify security cameras and alarm system\n\n4. EMERGENCY SWITCHOVER\n- If main transmitter fails: switch to backup Nautel VS2.5\n- Switchover procedure: Transfer switch on Panel A, position 2\n- Notify FCC if operating at reduced power for more than 10 days\n\n5. RF SAFETY\n- Maximum permissible exposure limits posted at site entrance\n- RF monitor badge required for all personnel\n- Reduce power before approaching antenna — coordinate with on-air staff`,
  },
  {
    id: "sop4",
    title: "Remote Broadcast Setup & Operations",
    category: "On-Air",
    version: "2.0",
    lastReviewed: "2025-12-10",
    reviewer: "Devon Robinson",
    status: "Review Due",
    sections: ["Equipment Checklist", "Site Survey", "Audio Setup", "Troubleshooting", "Teardown"],
    content: `WCCG 104.5 FM — Remote Broadcast Procedures\n\n1. EQUIPMENT CHECKLIST\n- Comrex ACCESS NX Portable (IP codec)\n- LTE modem + backup hotspot\n- 2x Electro-Voice RE20 microphones + stands\n- Mackie 802 field mixer\n- Headphones (2 pair)\n- XLR cables (4x 25ft, 2x 50ft)\n- Power strip + 100ft extension cord\n- WCCG banner and signage\n- Business cards and giveaway items\n\n2. SITE SURVEY (Day Before)\n- Verify power availability at venue\n- Test cell signal strength (need 3+ bars LTE)\n- Identify broadcast position with good crowd visibility\n- Confirm load-in/load-out access and timing\n- Get venue contact information\n\n3. AUDIO SETUP\n- Connect mics to Mackie mixer channels 1-2\n- Connect mixer main out to Comrex input\n- Connect Comrex to studio via LTE (primary) or venue WiFi (backup)\n- Test audio levels with studio — aim for -18 dBFS average\n- Set up mix-minus from studio to Comrex for IFB\n- Test talkback to studio\n\n4. TROUBLESHOOTING\n- No connection: Try backup hotspot, check Comrex IP settings\n- Audio feedback: Verify mix-minus is configured on studio console\n- Poor audio quality: Reduce Comrex bitrate, check LTE signal\n- If all else fails: Call studio, they can play pre-recorded segments\n\n5. TEARDOWN\n- Disconnect all cables and wrap properly\n- Pack equipment in cases — do not stack heavy items on mics\n- Return all equipment to Room 104 storage\n- Submit equipment condition report to Operations Manager`,
  },
  {
    id: "sop5",
    title: "Network & IT Security Procedures",
    category: "Technical",
    version: "1.8",
    lastReviewed: "2026-02-01",
    reviewer: "Devon Robinson",
    status: "Current",
    sections: ["Password Policy", "Network Access", "Backup Procedures", "Incident Response", "Vendor Access"],
    content: `WCCG 104.5 FM — IT Security Procedures\n\n1. PASSWORD POLICY\n- Minimum 12 characters, mixed case, numbers, symbols\n- Change every 90 days\n- No password sharing — each user has individual credentials\n- Admin passwords stored in secure password manager (Bitwarden)\n\n2. NETWORK ACCESS\n- Studio network (VLAN 10): On-air systems only — no internet browsing\n- Office network (VLAN 20): Email, web, business applications\n- Guest network (VLAN 30): Visitors and personal devices\n- Transmitter site connected via VPN tunnel\n\n3. BACKUP PROCEDURES\n- Automation server: Daily full backup + 4-hour incrementals\n- Traffic/billing: Daily backup to cloud (Backblaze B2)\n- Email: Daily backup to cloud\n- Test restore from backup quarterly\n\n4. INCIDENT RESPONSE\n- Suspected breach: Disconnect affected system from network immediately\n- Contact Operations Manager and Chief Engineer\n- Document incident — time, systems affected, actions taken\n- If listener data compromised: notify GM within 1 hour\n\n5. VENDOR ACCESS\n- All remote vendor access via VPN only\n- Temporary credentials for vendor sessions — revoke after completion\n- Vendor activity logged and reviewed weekly`,
  },
  {
    id: "sop6",
    title: "Studio Equipment Operation Guide",
    category: "On-Air",
    version: "3.2",
    lastReviewed: "2026-02-20",
    reviewer: "Chris Morgan",
    status: "Current",
    sections: ["Console Operation", "Microphone Setup", "Phone System", "Recording", "Troubleshooting"],
    content: `WCCG 104.5 FM — Studio Equipment Operation Guide\n\n1. CONSOLE OPERATION (Wheatstone LX-24)\n- Power on: Main power switch on rear panel, then surface power button\n- Source assignment: Touch screen > Source > assign to fader\n- Monitor select: Press MON button, select source from touch screen\n- Talkback: Hold TB button, speak into talkback mic\n- Meter bridge: Shows all active channel levels\n\n2. MICROPHONE SETUP\n- Studio A mics: EV RE20 — position 2-3 inches from mouth\n- Phantom power NOT required for RE20 (dynamic mic)\n- Mic processing: Wheatstone built-in — do not adjust without PD approval\n- Pop filter recommended for close-mic technique\n\n3. PHONE SYSTEM (Telos VX)\n- Incoming calls appear on Telos screen\n- Press LINE button to answer, HOLD to park\n- Route to air: assign Telos output to console fader\n- Caller screening: use delay dump button if needed (7-second delay active)\n\n4. RECORDING\n- Zetta: Press REC button on screen, select save location\n- Adobe Audition: Available in Studio B for production work\n- File format: WAV 44.1kHz 16-bit for broadcast, MP3 320kbps for web\n\n5. TROUBLESHOOTING\n- No audio on fader: Check source assignment and channel ON button\n- Mic not working: Check cable connections and channel strip settings\n- Console frozen: Soft reset via touch screen > System > Restart Surface\n- If console unresponsive: Contact Chief Engineer — do NOT power cycle`,
  },
  {
    id: "sop7",
    title: "Severe Weather Operations Plan",
    category: "Emergency",
    version: "2.2",
    lastReviewed: "2026-01-05",
    reviewer: "Marcus Thompson",
    status: "Current",
    sections: ["Activation Levels", "Staffing Requirements", "On-Air Coverage", "Shelter-in-Place", "Post-Event"],
    content: `WCCG 104.5 FM — Severe Weather Operations Plan\n\n1. ACTIVATION LEVELS\n- Level 1 (Monitor): NWS Watch issued — monitor conditions, prepare staff\n- Level 2 (Alert): NWS Warning issued — begin extended coverage\n- Level 3 (Emergency): Tornado on the ground or major hurricane — continuous coverage\n\n2. STAFFING REQUIREMENTS\n- Level 1: Normal staffing, PD and News on standby\n- Level 2: Additional on-air host, PD in station, engineer on call\n- Level 3: All hands — GM, PD, engineers, all available on-air talent\n\n3. ON-AIR COVERAGE\n- Break into programming with NWS information\n- Use WCCG severe weather open (cart: WX-OPEN-01)\n- Provide location-specific information for Fayetteville/Cumberland County area\n- Take calls from listeners reporting conditions\n- Repeat safety information every 15 minutes minimum\n- Coordinate with Cumberland County Emergency Management\n\n4. SHELTER-IN-PLACE\n- If tornado warning includes station location:\n  - Move to interior hallway (no windows)\n  - If Studio A is safest, continue broadcasting from there\n  - Grab portable weather radio and flashlight from emergency cabinet\n  - Account for all personnel in building\n\n5. POST-EVENT\n- Continue coverage until all warnings expire\n- Transition to recovery information (shelters, road closures, power outages)\n- Document coverage for FCC public file\n- Debrief with staff within 48 hours`,
  },
  {
    id: "sop8",
    title: "FCC Public File Maintenance",
    category: "Administrative",
    version: "1.5",
    lastReviewed: "2026-03-01",
    reviewer: "Devon Robinson",
    status: "Current",
    sections: ["Required Documents", "Upload Schedule", "Political Files", "Access Requirements"],
    content: `WCCG 104.5 FM — FCC Public File Maintenance\n\n1. REQUIRED DOCUMENTS\n- Authorization (station license)\n- Contour maps\n- Ownership reports (Form 323 — biennial)\n- EEO public file reports (annual)\n- Quarterly issues/programs lists\n- Political file (as needed during election periods)\n- Children's TV programming reports (N/A for radio — filed waiver)\n- Time brokerage agreements (if applicable)\n- Joint sales agreements (if applicable)\n- Letters from the public\n\n2. UPLOAD SCHEDULE\n- Issues/Programs List: Within 10 days of end of each quarter\n  - Q1 due: April 10 | Q2 due: July 10 | Q3 due: Oct 10 | Q4 due: Jan 10\n- EEO Report: Anniversary of license (annually)\n- Ownership Report: November 1 (biennially)\n- Political files: Within 24 hours of request/purchase\n\n3. POLITICAL FILES\n- During election periods, all political ad requests and purchases must be logged\n- Include: candidate name, office, ad schedule, rates charged, class of time\n- Upload to FCC online public file within 24 hours\n- Maintain records for 2 years after election\n\n4. ACCESS REQUIREMENTS\n- Public file must be available online at FCC's website\n- Station must also maintain local copy accessible during business hours\n- Respond to public inquiries about file contents within reasonable timeframe`,
  },
  {
    id: "sop9",
    title: "New Employee Onboarding — Operations",
    category: "Administrative",
    version: "1.3",
    lastReviewed: "2025-11-15",
    reviewer: "Devon Robinson",
    status: "Review Due",
    sections: ["Day 1 Checklist", "Systems Access", "Training Schedule", "Safety Orientation"],
    content: `WCCG 104.5 FM — Operations Onboarding Procedures\n\n1. DAY 1 CHECKLIST\n- Issue building keys/access card\n- Create email account and phone extension\n- Provide employee handbook and operations manual\n- Tour of facilities: studios, server room, production rooms, transmitter site (scheduled)\n- Introduction to team members\n- Review emergency procedures and exit routes\n\n2. SYSTEMS ACCESS\n- Zetta automation: Read-only access initially, production access after training\n- Traffic system: Access level based on role\n- Email and shared drives: Standard access\n- Studio console: Training required before solo operation\n- EAS system: Chief Engineer training required\n\n3. TRAINING SCHEDULE (First 2 Weeks)\n- Day 1-2: Facility orientation, HR paperwork, IT setup\n- Day 3-4: Console training with Production Director\n- Day 5: Zetta automation training\n- Week 2: Shadowing on-air shifts, production sessions\n- Week 2 end: Competency assessment\n\n4. SAFETY ORIENTATION\n- Fire exits and extinguisher locations\n- Severe weather shelter areas\n- RF safety awareness (transmitter site)\n- Emergency contact list\n- First aid kit locations`,
  },
  {
    id: "sop10",
    title: "Tower Light Monitoring & Reporting",
    category: "Technical",
    version: "2.0",
    lastReviewed: "2026-02-10",
    reviewer: "James Carter",
    status: "Current",
    sections: ["Monitoring Requirements", "Failure Reporting", "Log Maintenance", "Annual Inspection"],
    content: `WCCG 104.5 FM — Tower Light Monitoring & Reporting\n\n1. MONITORING REQUIREMENTS (47 CFR 17.47)\n- Tower lights must be observed at least once every 24 hours\n- Automatic monitoring system (alarm) required — currently installed\n- Alarm notification goes to Chief Engineer cell phone and station email\n- Visual inspection during daytime site visits\n\n2. FAILURE REPORTING\n- Report tower light outage to FAA within 15 minutes of discovery\n- FAA NOTAM line: 1-877-487-6867\n- Include: Structure Registration Number (ASR), location, nature of failure\n- Log the NOTAM number\n- Report restoration to FAA within 15 minutes of repair\n\n3. LOG MAINTENANCE\n- Maintain tower light inspection log\n- Record: date, time, observer, status (operational/failure)\n- Retain logs for 2 years per FCC rules\n- Logs stored in station public file and at transmitter site\n\n4. ANNUAL INSPECTION\n- Certified tower crew inspects all lighting annually\n- Check beacon, side markers, photo cell, flasher unit\n- Replace any dim or failed lamps\n- Test backup power for lighting system\n- Document inspection with photos and written report`,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SOPLibraryPage() {
  const [mounted, setMounted] = useState(false);
  const [sops, setSOPs] = useState<SOPDocument[]>([]);
  const [selected, setSelected] = useState<SOPDocument | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    setSOPs(loadOrSeed("ops_sops", SEED_SOPS));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  const categories = ["all", "On-Air", "Technical", "Emergency", "Administrative"];
  const filtered = filterCategory === "all" ? sops : sops.filter((s) => s.category === filterCategory);

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "On-Air": return <Radio className="h-3.5 w-3.5 text-[#74ddc7]" />;
      case "Technical": return <Wrench className="h-3.5 w-3.5 text-blue-400" />;
      case "Emergency": return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
      case "Administrative": return <Briefcase className="h-3.5 w-3.5 text-purple-400" />;
      default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const currentCount = sops.filter((s) => s.status === "Current").length;
  const reviewDueCount = sops.filter((s) => s.status === "Review Due").length;

  const columns: Column<SOPDocument>[] = [
    {
      key: "title",
      label: "SOP Title",
      sortable: true,
      sortKey: (r) => r.title,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
            {categoryIcon(r.category)}
          </div>
          <div>
            <p className="font-medium text-foreground">{r.title}</p>
            <p className="text-[10px] text-muted-foreground">v{r.version} — {r.sections.length} sections</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      sortKey: (r) => r.category,
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.category}</span>,
    },
    {
      key: "lastReviewed",
      label: "Last Reviewed",
      sortable: true,
      sortKey: (r) => r.lastReviewed,
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.lastReviewed)}</span>,
    },
    {
      key: "reviewer",
      label: "Reviewer",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.reviewer}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status === "Current" ? "compliant" : r.status === "Review Due" ? "warning" : "draft"} />,
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={BookOpen}
        iconColor="text-[#74ddc7]"
        iconBg="bg-[#74ddc7]/10 border-[#74ddc7]/20"
        title="SOP Library"
        description="Standard Operating Procedures for WCCG 104.5 FM operations"
        badge={`${sops.length} SOPs`}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total SOPs" value={sops.length} icon={BookOpen} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Current" value={currentCount} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Review Due" value={reviewDueCount} icon={Calendar} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Categories" value={4} icon={Tag} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Category filter */}
      <TabsNav
        tabs={categories.map((c) => ({
          key: c,
          label: c === "all" ? "All" : c,
          count: c === "all" ? sops.length : sops.filter((s) => s.category === c).length,
        }))}
        active={filterCategory}
        onChange={setFilterCategory}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search SOPs..."
        searchFilter={(row, q) =>
          row.title.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          row.reviewer.toLowerCase().includes(q)
        }
        onRowClick={(row) => setSelected(row)}
      />

      {/* Detail modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ""}
        subtitle={selected ? `${selected.category} — v${selected.version} — Last reviewed ${formatDate(selected.lastReviewed)} by ${selected.reviewer}` : ""}
        maxWidth="max-w-3xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={selected.status === "Current" ? "compliant" : "warning"} />
              <span className="text-xs text-muted-foreground">Version {selected.version}</span>
            </div>

            {/* Sections index */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
              <div className="flex flex-wrap gap-2">
                {selected.sections.map((s, i) => (
                  <span key={i} className="text-xs bg-muted rounded-lg px-2.5 py-1 text-foreground">
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Full content */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Full Content</p>
              <div className="rounded-xl border border-border bg-background p-4 max-h-[400px] overflow-y-auto">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {selected.content}
                </pre>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
