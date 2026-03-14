"use client";

import { useState, useEffect } from "react";
import {
  HardDrive,
  Wrench,
  Tag,
  Shield,
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

interface EquipmentItem {
  id: string;
  name: string;
  category: "Studio" | "Transmitter" | "IT" | "Field" | "Production";
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  condition: "Excellent" | "Good" | "Fair" | "Poor";
  purchaseDate: string;
  purchasePrice: number;
  lastMaintenance: string;
  nextMaintenance: string;
  warrantyExpiry: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_EQUIPMENT: EquipmentItem[] = [
  { id: "eq1", name: "Main Transmitter", category: "Transmitter", serialNumber: "NAU-TX25-0847", manufacturer: "Nautel", model: "GV25", location: "Transmitter Site — Bunce Rd Tower", condition: "Excellent", purchaseDate: "2021-06-15", purchasePrice: 85000, lastMaintenance: "2026-02-15", nextMaintenance: "2026-05-15", warrantyExpiry: "2026-06-15", notes: "25 kW FM transmitter. Annual tube replacement due June." },
  { id: "eq2", name: "Backup Transmitter", category: "Transmitter", serialNumber: "NAU-TX5-1234", manufacturer: "Nautel", model: "VS2.5", location: "Transmitter Site — Bunce Rd Tower", condition: "Good", purchaseDate: "2018-03-10", purchasePrice: 22000, lastMaintenance: "2026-01-20", nextMaintenance: "2026-04-20", warrantyExpiry: "2023-03-10", notes: "2.5 kW backup. Out of warranty — service contract active." },
  { id: "eq3", name: "Studio A Console", category: "Studio", serialNumber: "WH-LX24-5567", manufacturer: "Wheatstone", model: "LX-24", location: "Studio A — Main On-Air", condition: "Excellent", purchaseDate: "2022-01-20", purchasePrice: 38000, lastMaintenance: "2026-03-01", nextMaintenance: "2026-06-01", warrantyExpiry: "2027-01-20", notes: "Primary on-air console. 24 faders, AoIP." },
  { id: "eq4", name: "Studio B Console", category: "Studio", serialNumber: "WH-E6-3321", manufacturer: "Wheatstone", model: "E-6", location: "Studio B — Production", condition: "Fair", purchaseDate: "2016-08-05", purchasePrice: 18000, lastMaintenance: "2025-12-10", nextMaintenance: "2026-03-10", warrantyExpiry: "2021-08-05", notes: "Production console — fader 7 intermittent. Engineering request submitted." },
  { id: "eq5", name: "EAS Encoder/Decoder", category: "Studio", serialNumber: "DAS-ONE-7890", manufacturer: "Digital Alert Systems", model: "DASDEC-II", location: "Studio A — EAS Rack", condition: "Good", purchaseDate: "2020-04-12", purchasePrice: 4500, lastMaintenance: "2026-02-28", nextMaintenance: "2026-08-28", warrantyExpiry: "2025-04-12", notes: "CAP-compliant. Firmware v4.1. Connected to NWS feed." },
  { id: "eq6", name: "Audio Processor", category: "Studio", serialNumber: "ORB-8700i-2255", manufacturer: "Orban", model: "Optimod 8700i", location: "Studio A — Processing Rack", condition: "Excellent", purchaseDate: "2023-02-01", purchasePrice: 12000, lastMaintenance: "2026-01-15", nextMaintenance: "2026-07-15", warrantyExpiry: "2028-02-01", notes: "FM audio processor. 5-band. Current preset: Urban Contemporary." },
  { id: "eq7", name: "Automation Server", category: "IT", serialNumber: "DELL-R740-9981", manufacturer: "Dell", model: "PowerEdge R740", location: "Server Room — Rack 1", condition: "Good", purchaseDate: "2021-09-01", purchasePrice: 8500, lastMaintenance: "2026-03-05", nextMaintenance: "2026-06-05", warrantyExpiry: "2026-09-01", notes: "Runs RCS Zetta automation. 64GB RAM, RAID 10. Warranty expiring soon." },
  { id: "eq8", name: "Backup Automation Server", category: "IT", serialNumber: "DELL-R740-9982", manufacturer: "Dell", model: "PowerEdge R740", location: "Server Room — Rack 1", condition: "Good", purchaseDate: "2021-09-01", purchasePrice: 8500, lastMaintenance: "2026-03-05", nextMaintenance: "2026-06-05", warrantyExpiry: "2026-09-01", notes: "Mirror of primary automation server. Hot standby." },
  { id: "eq9", name: "STL Microwave Link", category: "Transmitter", serialNumber: "MOS-SL9003-4455", manufacturer: "Moseley", model: "Starlink SL9003", location: "Studio Roof / Transmitter Site", condition: "Excellent", purchaseDate: "2022-05-20", purchasePrice: 15000, lastMaintenance: "2026-02-01", nextMaintenance: "2026-08-01", warrantyExpiry: "2027-05-20", notes: "Digital STL — 950 MHz. Primary studio-to-transmitter link." },
  { id: "eq10", name: "Remote Broadcast Kit", category: "Field", serialNumber: "COM-BRIC-6677", manufacturer: "Comrex", model: "ACCESS NX Portable", location: "Equipment Storage — Room 104", condition: "Good", purchaseDate: "2023-08-15", purchasePrice: 4200, lastMaintenance: "2026-01-10", nextMaintenance: "2026-07-10", warrantyExpiry: "2026-08-15", notes: "IP codec for remote broadcasts. Includes LTE modem." },
  { id: "eq11", name: "Production Microphone (x4)", category: "Production", serialNumber: "EV-RE20-BATCH", manufacturer: "Electro-Voice", model: "RE20", location: "Studios A & B", condition: "Good", purchaseDate: "2020-11-01", purchasePrice: 1800, lastMaintenance: "2025-11-15", nextMaintenance: "2026-05-15", warrantyExpiry: "2023-11-01", notes: "4 units — 2 in Studio A, 2 in Studio B. Annual cleaning." },
  { id: "eq12", name: "Streaming Server", category: "IT", serialNumber: "DELL-R640-7788", manufacturer: "Dell", model: "PowerEdge R640", location: "Server Room — Rack 2", condition: "Good", purchaseDate: "2022-03-01", purchasePrice: 6200, lastMaintenance: "2026-02-20", nextMaintenance: "2026-05-20", warrantyExpiry: "2027-03-01", notes: "Runs Icecast + Centova Cast. Streams at 128kbps AAC." },
  { id: "eq13", name: "Tower Lighting System", category: "Transmitter", serialNumber: "TLC-LED-2200", manufacturer: "TWR Lighting", model: "Beacon LED", location: "Bunce Rd Tower — Top", condition: "Excellent", purchaseDate: "2024-01-15", purchasePrice: 3200, lastMaintenance: "2026-01-15", nextMaintenance: "2027-01-15", warrantyExpiry: "2029-01-15", notes: "LED tower beacon. FAA-compliant. Alarm monitoring active." },
  { id: "eq14", name: "Generator", category: "Transmitter", serialNumber: "CAT-D150-8899", manufacturer: "Caterpillar", model: "D150", location: "Transmitter Site — Bunce Rd", condition: "Good", purchaseDate: "2019-07-01", purchasePrice: 45000, lastMaintenance: "2026-02-28", nextMaintenance: "2026-05-28", warrantyExpiry: "2024-07-01", notes: "150 kW diesel generator. Bi-weekly test runs. Tank: 500 gal." },
  { id: "eq15", name: "UPS System", category: "IT", serialNumber: "APC-SRT10-3344", manufacturer: "APC", model: "Smart-UPS SRT 10kVA", location: "Server Room — Rack 3", condition: "Fair", purchaseDate: "2019-04-01", purchasePrice: 5800, lastMaintenance: "2026-02-10", nextMaintenance: "2026-05-10", warrantyExpiry: "2024-04-01", notes: "Battery replacement needed within 60 days. Runtime: ~12 min." },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EquipmentPage() {
  const [mounted, setMounted] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [selected, setSelected] = useState<EquipmentItem | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    setEquipment(loadOrSeed("ops_equipment", SEED_EQUIPMENT));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  const categories = ["all", "Studio", "Transmitter", "IT", "Field", "Production"];
  const filtered = filterCategory === "all" ? equipment : equipment.filter((e) => e.category === filterCategory);

  const conditionColor = (c: string) => {
    switch (c) {
      case "Excellent": return "compliant";
      case "Good": return "active";
      case "Fair": return "warning";
      case "Poor": return "critical";
      default: return "pending";
    }
  };

  const totalValue = equipment.reduce((sum, e) => sum + e.purchasePrice, 0);
  const needsMaintenance = equipment.filter((e) => new Date(e.nextMaintenance) <= new Date()).length;
  const warrantyExpiring = equipment.filter((e) => {
    const exp = new Date(e.warrantyExpiry);
    const now = new Date();
    const soon = new Date(now.getTime() + 90 * 24 * 3600000);
    return exp > now && exp <= soon;
  }).length;

  const columns: Column<EquipmentItem>[] = [
    {
      key: "name",
      label: "Equipment",
      sortable: true,
      sortKey: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.name}</p>
          <p className="text-[10px] text-muted-foreground">{r.manufacturer} {r.model}</p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      sortKey: (r) => r.category,
      render: (r) => <span className="text-xs text-muted-foreground">{r.category}</span>,
    },
    {
      key: "location",
      label: "Location",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.location}</span>,
    },
    {
      key: "condition",
      label: "Condition",
      sortable: true,
      sortKey: (r) => r.condition,
      render: (r) => <StatusBadge status={conditionColor(r.condition)} />,
    },
    {
      key: "lastMaintenance",
      label: "Last Maint.",
      hideOnMobile: true,
      sortable: true,
      sortKey: (r) => r.lastMaintenance,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.lastMaintenance)}</span>,
    },
    {
      key: "warrantyExpiry",
      label: "Warranty",
      hideOnMobile: true,
      render: (r) => {
        const expired = new Date(r.warrantyExpiry) < new Date();
        return <span className={`text-xs ${expired ? "text-red-400" : "text-muted-foreground"}`}>{expired ? "Expired" : formatDate(r.warrantyExpiry)}</span>;
      },
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={HardDrive}
        iconColor="text-purple-400"
        iconBg="bg-purple-500/10 border-purple-500/20"
        title="Equipment Inventory"
        description="Track all WCCG 104.5 FM station equipment, maintenance & warranties"
        badge={`${equipment.length} Items`}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Equipment" value={equipment.length} icon={HardDrive} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard label="Total Asset Value" value={`$${(totalValue / 1000).toFixed(0)}K`} icon={Tag} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Maintenance Due" value={needsMaintenance} icon={Wrench} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard label="Warranty Expiring" value={warrantyExpiring} icon={Shield} color="text-yellow-400" bg="bg-yellow-500/10" trend="Within 90 days" />
      </div>

      {/* Category filter tabs */}
      <TabsNav
        tabs={categories.map((c) => ({
          key: c,
          label: c === "all" ? "All" : c,
          count: c === "all" ? equipment.length : equipment.filter((e) => e.category === c).length,
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
        searchPlaceholder="Search equipment..."
        searchFilter={(row, q) =>
          row.name.toLowerCase().includes(q) ||
          row.serialNumber.toLowerCase().includes(q) ||
          row.manufacturer.toLowerCase().includes(q) ||
          row.location.toLowerCase().includes(q)
        }
        onRowClick={(row) => setSelected(row)}
      />

      {/* Detail modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected ? `${selected.manufacturer} ${selected.model}` : ""}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Serial Number</p>
                <p className="text-sm font-mono text-foreground">{selected.serialNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                <p className="text-sm text-foreground">{selected.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Location</p>
                <p className="text-sm text-foreground">{selected.location}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Condition</p>
                <StatusBadge status={conditionColor(selected.condition)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Purchase Date</p>
                <p className="text-sm text-foreground">{formatDate(selected.purchaseDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Purchase Price</p>
                <p className="text-sm text-foreground">${selected.purchasePrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Maintenance</p>
                <p className="text-sm text-foreground">{formatDate(selected.lastMaintenance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Maintenance</p>
                <p className="text-sm text-foreground">{formatDate(selected.nextMaintenance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Warranty Expiry</p>
                <p className={`text-sm ${new Date(selected.warrantyExpiry) < new Date() ? "text-red-400" : "text-foreground"}`}>
                  {formatDate(selected.warrantyExpiry)}
                  {new Date(selected.warrantyExpiry) < new Date() && " (Expired)"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-foreground">{selected.notes}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
