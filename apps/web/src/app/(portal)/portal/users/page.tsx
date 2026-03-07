"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  Headphones,
  Mic,
  Megaphone,
  Radio,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Filter,
} from "lucide-react";
import { useDemoRole } from "../layout";
import { ROLE_CONFIGS } from "../_lib/role-config";

// ---------------------------------------------------------------------------
// Mock users data
// ---------------------------------------------------------------------------

interface MockUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  joinDate: string;
  lastActive: string;
}

const MOCK_USERS: MockUserRow[] = [
  { id: "u1", name: "Keisha Palmer", email: "keisha@wccg.fm", role: "Administrator", status: "active", joinDate: "Jan 15, 2024", lastActive: "Today" },
  { id: "u2", name: "Marcus Thompson", email: "marcus.t@wccg.fm", role: "Sales Manager", status: "active", joinDate: "Feb 3, 2024", lastActive: "Today" },
  { id: "u3", name: "DJ SpinWiz", email: "spinwiz@wccg.fm", role: "DJ / Host", status: "active", joinDate: "Mar 12, 2024", lastActive: "Today" },
  { id: "u4", name: "Aisha Reynolds", email: "aisha.r@wccg.fm", role: "Content Creator", status: "active", joinDate: "Apr 8, 2024", lastActive: "Yesterday" },
  { id: "u5", name: "Jordan Williams", email: "jordan.w@adcorp.com", role: "Advertiser", status: "active", joinDate: "May 22, 2024", lastActive: "2 days ago" },
  { id: "u6", name: "Taylor Jackson", email: "taylor.j@gmail.com", role: "Listener", status: "active", joinDate: "Jun 1, 2024", lastActive: "Today" },
  { id: "u7", name: "Big Mike", email: "bigmike@wccg.fm", role: "DJ / Host", status: "active", joinDate: "Jan 20, 2024", lastActive: "Today" },
  { id: "u8", name: "Sarah Chen", email: "sarah.c@wccg.fm", role: "Content Creator", status: "active", joinDate: "Jul 15, 2024", lastActive: "3 days ago" },
  { id: "u9", name: "Andre Davis", email: "andre.d@localcars.com", role: "Advertiser", status: "pending", joinDate: "Feb 28, 2026", lastActive: "Never" },
  { id: "u10", name: "Pastor James", email: "pj@gracechurch.org", role: "DJ / Host", status: "active", joinDate: "Aug 5, 2024", lastActive: "Yesterday" },
  { id: "u11", name: "Lisa Monroe", email: "lisa.m@gmail.com", role: "Listener", status: "inactive", joinDate: "Sep 10, 2024", lastActive: "30 days ago" },
  { id: "u12", name: "Derek Owens", email: "derek.o@fitgym.com", role: "Advertiser", status: "active", joinDate: "Oct 2, 2024", lastActive: "5 days ago" },
  { id: "u13", name: "Nina Patel", email: "nina.p@wccg.fm", role: "Sales Manager", status: "active", joinDate: "Nov 18, 2024", lastActive: "Today" },
  { id: "u14", name: "Chris Adams", email: "chris.a@gmail.com", role: "Listener", status: "active", joinDate: "Dec 1, 2024", lastActive: "Today" },
  { id: "u15", name: "Tasha Brown", email: "tasha.b@wccg.fm", role: "Content Creator", status: "active", joinDate: "Jan 5, 2025", lastActive: "Yesterday" },
];

// ---------------------------------------------------------------------------
// Status Message
// ---------------------------------------------------------------------------

function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }, []);
  return { message, showMessage };
}

function StatusToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border border-white/10 bg-[#1a1a2e] px-4 py-3 text-sm text-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-[#74ddc7]" />
          {message}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const { message, showMessage } = useStatusMessage();

  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-[#74ddc7]" />
      </div>
    );
  }

  const config = ROLE_CONFIGS[role];

  const filteredUsers = MOCK_USERS.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      inactive: "border-white/20 bg-white/5 text-muted-foreground",
      pending: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
    };
    return colors[status] || "";
  };

  const roleIcon = (roleName: string) => {
    const icons: Record<string, typeof Shield> = {
      Administrator: Shield,
      "Sales Manager": Users,
      "DJ / Host": Headphones,
      "Content Creator": Mic,
      Advertiser: Megaphone,
      Listener: Radio,
    };
    return icons[roleName] || Users;
  };

  const uniqueRoles = [...new Set(MOCK_USERS.map((u) => u.role))];

  return (
    <div className="space-y-6">
      <StatusToast message={message} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/overview">
                <ArrowLeft className="mr-1 size-4" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage platform users, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-white/10 text-muted-foreground hover:text-foreground"
            onClick={() => showMessage("Exporting user data...")}
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button
            className="bg-[#10b981] text-white hover:bg-[#10b981]/90"
            onClick={() => showMessage("Opening new user form...")}
          >
            <Plus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Users", value: "2,847", color: "#10b981" },
          { label: "Active", value: "2,691", color: "#74ddc7" },
          { label: "Pending", value: "23", color: "#f97316" },
          { label: "Inactive", value: "133", color: "#ef4444" },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/10 bg-[#12121a]">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <div
                className="mt-2 h-1 w-full rounded-full bg-white/5"
              >
                <div
                  className="h-1 rounded-full"
                  style={{
                    backgroundColor: stat.color,
                    width: stat.label === "Total Users" ? "100%" : stat.label === "Active" ? "94%" : stat.label === "Pending" ? "1%" : "5%",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-white/10 bg-white/5 pl-10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Users</CardTitle>
            <Badge variant="outline" className="border-white/20 text-muted-foreground">
              {filteredUsers.length} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Joined</TableHead>
                <TableHead className="text-muted-foreground">Last Active</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const RoleIcon = roleIcon(user.role);
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer border-white/5 transition-colors hover:bg-white/5"
                    onClick={() => showMessage(`Viewing profile: ${user.name}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: config.accentColor }}
                        >
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RoleIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{user.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.joinDate}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.lastActive}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          showMessage(`Actions menu for ${user.name}`);
                        }}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No users found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
