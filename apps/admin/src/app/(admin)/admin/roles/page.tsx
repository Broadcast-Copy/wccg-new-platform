"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Shield,
  Edit,
  Radio,
  Headphones,
  Megaphone,
  DollarSign,
  UserCog,
  ExternalLink,
  XCircle,
  Check,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface RoleDef {
  id: string;
  name: string;
  color: string;
  description: string;
  permissions: string[];
  destination: string;
  icon: React.ElementType;
  userCount: number;
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  joined: string;
}

interface PermissionRow {
  permission: string;
  admin: string;
  editor: string;
  djHost: string;
  listener: string;
  advertiser: string;
  sales: string;
}

const STORAGE_KEY = "wccg-test-role";

const ROLES: RoleDef[] = [
  {
    id: "admin",
    name: "Admin",
    color: "#10b981",
    description:
      "Full platform access - manage all content, users, and settings",
    permissions: [
      "All permissions",
      "System settings",
      "User management",
      "Full analytics",
    ],
    destination: "/admin",
    icon: Shield,
    userCount: 1,
  },
  {
    id: "editor",
    name: "Editor",
    color: "#3b82f6",
    description:
      "Content management - manage shows, hosts, schedule, events",
    permissions: [
      "Content CRUD",
      "Scheduling",
      "Event management",
      "Moderation",
    ],
    destination: "/admin",
    icon: Edit,
    userCount: 2,
  },
  {
    id: "listener",
    name: "Listener",
    color: "#7401df",
    description:
      "Standard user - listen, favorite, follow, earn points, attend events",
    permissions: [
      "Read content",
      "Personal data",
      "Points & rewards",
      "Create events",
    ],
    destination: "/my",
    icon: Radio,
    userCount: 247,
  },
  {
    id: "dj-host",
    name: "DJ / Host",
    color: "#74ddc7",
    description:
      "On-air talent - manage own shows, upload mixes, edit profile",
    permissions: [
      "Own content",
      "Upload mixes",
      "Own analytics",
      "Profile edit",
    ],
    destination: "/dashboard",
    icon: Headphones,
    userCount: 8,
  },
  {
    id: "advertiser",
    name: "Advertiser",
    color: "#ef4444",
    description:
      "Ad buyer - manage campaigns, upload creatives, view analytics",
    permissions: [
      "Ad platform",
      "Campaign CRUD",
      "Upload creatives",
      "Own analytics",
    ],
    destination: "/advertise/portal",
    icon: Megaphone,
    userCount: 14,
  },
  {
    id: "sales-manager",
    name: "Sales Manager",
    color: "#f97316",
    description:
      "Internal sales - manage client relationships, proposals, revenue",
    permissions: [
      "CRM access",
      "Revenue data",
      "Client management",
      "Ad management",
    ],
    destination: "/advertise/portal/clients",
    icon: DollarSign,
    userCount: 3,
  },
];

const MOCK_USERS: MockUser[] = [
  {
    id: "u1",
    name: "Kalim Hasan",
    email: "biggleem@gmail.com",
    roles: ["admin"],
    joined: "Today",
  },
  {
    id: "u2",
    name: "DJ SpinWiz",
    email: "spinwiz@wccg.com",
    roles: ["dj-host"],
    joined: "Jan 15",
  },
  {
    id: "u3",
    name: "Angela Yee",
    email: "angela@wayup.com",
    roles: ["dj-host", "editor"],
    joined: "Dec 1",
  },
  {
    id: "u4",
    name: "Yung Joc",
    email: "yungjoc@streetz.com",
    roles: ["dj-host"],
    joined: "Nov 20",
  },
  {
    id: "u5",
    name: "Sarah Johnson",
    email: "sarah.j@gmail.com",
    roles: ["listener"],
    joined: "Feb 10",
  },
  {
    id: "u6",
    name: "Marcus Williams",
    email: "marcus.w@outlook.com",
    roles: ["listener"],
    joined: "Feb 8",
  },
  {
    id: "u7",
    name: "Mike Thompson",
    email: "mike@crosscreekmall.com",
    roles: ["advertiser"],
    joined: "Jan 22",
  },
  {
    id: "u8",
    name: "Jennifer Davis",
    email: "jen@capefearvalley.com",
    roles: ["advertiser"],
    joined: "Jan 18",
  },
  {
    id: "u9",
    name: "Robert Chen",
    email: "robert@wccgsales.com",
    roles: ["sales-manager"],
    joined: "Dec 15",
  },
  {
    id: "u10",
    name: "Lisa Park",
    email: "lisa@wccgsales.com",
    roles: ["sales-manager", "editor"],
    joined: "Dec 10",
  },
];

const PERMISSIONS_MATRIX: PermissionRow[] = [
  {
    permission: "View Dashboard",
    admin: "yes",
    editor: "yes",
    djHost: "yes",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "Manage Users",
    admin: "yes",
    editor: "no",
    djHost: "no",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "Manage Content",
    admin: "yes",
    editor: "yes",
    djHost: "own",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "Upload Mixes",
    admin: "yes",
    editor: "yes",
    djHost: "yes",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "View Analytics",
    admin: "yes",
    editor: "yes",
    djHost: "own",
    listener: "no",
    advertiser: "own",
    sales: "yes",
  },
  {
    permission: "Manage Events",
    admin: "yes",
    editor: "yes",
    djHost: "no",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "Create Events",
    admin: "yes",
    editor: "yes",
    djHost: "no",
    listener: "yes",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "Manage Ads",
    admin: "yes",
    editor: "no",
    djHost: "no",
    listener: "no",
    advertiser: "yes",
    sales: "yes",
  },
  {
    permission: "Manage Directory",
    admin: "yes",
    editor: "yes",
    djHost: "no",
    listener: "own",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "View Points",
    admin: "yes",
    editor: "no",
    djHost: "no",
    listener: "yes",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "Moderation",
    admin: "yes",
    editor: "yes",
    djHost: "no",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
  {
    permission: "System Settings",
    admin: "yes",
    editor: "no",
    djHost: "no",
    listener: "no",
    advertiser: "no",
    sales: "no",
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: render permission cell                                     */
/* ------------------------------------------------------------------ */

function PermissionCell({ value }: { value: string }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-1 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        <Check className="size-3.5" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-muted p-1 text-muted-foreground/40">
        <X className="size-3.5" />
      </span>
    );
  }
  /* "own" */
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5">
      Own only
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: resolve role display name                                  */
/* ------------------------------------------------------------------ */

function roleName(roleId: string): string {
  return ROLES.find((r) => r.id === roleId)?.name ?? roleId;
}

function roleColor(roleId: string): string {
  return ROLES.find((r) => r.id === roleId)?.color ?? "#6b7280";
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function AdminRolesPage() {
  const [activeTestRole, setActiveTestRole] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);

  /* Read localStorage on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveTestRole(stored);
      }
    } catch {
      /* SSR / privacy mode */
    }
  }, []);

  /* ---- role testing actions ---- */

  function activateTestRole(role: RoleDef) {
    try {
      localStorage.setItem(STORAGE_KEY, role.id);
    } catch {
      /* ignore */
    }
    setActiveTestRole(role.id);
    toast.success(`Now testing as ${role.name}`, {
      description: `Navigate to ${role.destination} to see the experience.`,
    });
  }

  function stopTestRole() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setActiveTestRole(null);
    toast.info("Role testing stopped", {
      description: "You are back to your normal admin view.",
    });
  }

  /* ---- edit roles dialog ---- */

  function openEditRoles(user: MockUser) {
    setEditingUser(user);
    setEditRoles([...user.roles]);
    setEditDialogOpen(true);
  }

  function toggleRole(roleId: string) {
    setEditRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  }

  function saveRoles() {
    if (editingUser) {
      toast.success(`Roles updated for ${editingUser.name}`, {
        description: `New roles: ${editRoles.map(roleName).join(", ") || "None"}`,
      });
    }
    setEditDialogOpen(false);
    setEditingUser(null);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-10">
      {/* ---- Page Header ---- */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <UserCog className="size-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Roles &amp; Testing
          </h1>
        </div>
        <p className="text-muted-foreground">
          Manage user roles and test the platform as different user types
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Section: Quick Role Test Panel                               */}
      {/* ============================================================ */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="size-5 text-primary" />
            Quick Role Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">
              Current test role:
            </span>
            {activeTestRole ? (
              <Badge
                className="text-white text-sm px-3 py-1"
                style={{ backgroundColor: roleColor(activeTestRole) }}
              >
                {roleName(activeTestRole)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1">
                No role active
              </Badge>
            )}
            {activeTestRole && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopTestRole}
                className="ml-2"
              >
                <XCircle className="size-4 mr-1" />
                Reset / Stop Testing
              </Button>
            )}
          </div>

          {/* Quick switch buttons */}
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => {
              const isActive = activeTestRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() =>
                    isActive ? stopTestRole() : activateTestRole(role)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? role.color : "transparent",
                    color: isActive ? "#fff" : role.color,
                    border: `2px solid ${role.color}`,
                  }}
                >
                  <role.icon className="size-3.5" />
                  {role.name}
                </button>
              );
            })}
          </div>

          {/* Destination links */}
          {activeTestRole && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-muted-foreground">Go to:</span>
              {ROLES.filter((r) => r.id === activeTestRole).map((role) => (
                <Link key={role.id} href={role.destination}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="size-3.5" />
                    {role.destination}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  Section 1: Available Roles (cards grid)                      */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Roles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => {
            const isActive = activeTestRole === role.id;
            const Icon = role.icon;

            return (
              <Card
                key={role.id}
                className="relative overflow-hidden"
                style={{ borderLeftWidth: 4, borderLeftColor: role.color }}
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  {/* Icon + title row */}
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center justify-center rounded-lg p-2"
                      style={{
                        backgroundColor: `${role.color}20`,
                        color: role.color,
                      }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold leading-tight">
                        {role.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {role.userCount}{" "}
                        {role.userCount === 1 ? "user" : "users"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>

                  {/* Permission badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <Badge
                        key={perm}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5"
                      >
                        {perm}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={stopTestRole}
                      >
                        <XCircle className="size-4 mr-1.5" />
                        Stop Testing
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full text-white"
                        style={{ backgroundColor: role.color }}
                        onClick={() => activateTestRole(role)}
                      >
                        Test as {role.name}
                      </Button>
                    )}
                  </div>

                  {/* Link to destination when active */}
                  {isActive && (
                    <Link href={role.destination} className="block">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                      >
                        <ExternalLink className="size-3.5" />
                        Go to {role.destination}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2: User Role Assignments (table)                     */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-xl font-semibold mb-4">User Role Assignments</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((rid) => (
                        <Badge
                          key={rid}
                          className="text-white text-[11px]"
                          style={{ backgroundColor: roleColor(rid) }}
                        >
                          {roleName(rid)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.joined}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditRoles(user)}
                    >
                      Edit Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 4: Role Permissions Matrix                           */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Role Permissions Matrix
        </h2>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Permission</TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="size-3.5" style={{ color: "#10b981" }} />
                    Admin
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <Edit className="size-3.5" style={{ color: "#3b82f6" }} />
                    Editor
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <Headphones
                      className="size-3.5"
                      style={{ color: "#74ddc7" }}
                    />
                    DJ/Host
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <Radio className="size-3.5" style={{ color: "#7401df" }} />
                    Listener
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <Megaphone
                      className="size-3.5"
                      style={{ color: "#ef4444" }}
                    />
                    Advertiser
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <DollarSign
                      className="size-3.5"
                      style={{ color: "#f97316" }}
                    />
                    Sales
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS_MATRIX.map((row) => (
                <TableRow key={row.permission}>
                  <TableCell className="font-medium">
                    {row.permission}
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionCell value={row.admin} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionCell value={row.editor} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionCell value={row.djHost} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionCell value={row.listener} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionCell value={row.advertiser} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PermissionCell value={row.sales} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Edit Roles Dialog                                            */}
      {/* ============================================================ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Roles {editingUser ? `- ${editingUser.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-1 py-2">
              <p className="text-sm text-muted-foreground mb-4">
                Select the roles for{" "}
                <span className="font-medium text-foreground">
                  {editingUser.email}
                </span>
              </p>

              <div className="space-y-2">
                {ROLES.map((role) => {
                  const isChecked = editRoles.includes(role.id);
                  const Icon = role.icon;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                      style={{
                        borderColor: isChecked ? role.color : undefined,
                        backgroundColor: isChecked
                          ? `${role.color}08`
                          : undefined,
                      }}
                    >
                      {/* Custom checkbox */}
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
                        style={{
                          borderColor: isChecked ? role.color : undefined,
                          backgroundColor: isChecked ? role.color : undefined,
                        }}
                      >
                        {isChecked && (
                          <Check className="size-3 text-white" />
                        )}
                      </span>

                      <span
                        className="inline-flex items-center justify-center rounded p-1"
                        style={{
                          color: role.color,
                          backgroundColor: `${role.color}20`,
                        }}
                      >
                        <Icon className="size-4" />
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {role.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveRoles}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
