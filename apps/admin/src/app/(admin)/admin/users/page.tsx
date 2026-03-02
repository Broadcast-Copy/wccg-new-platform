"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Eye,
  X,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  displayName?: string;
  roles?: string[];
  role?: string;
  isActive: boolean;
  createdAt: string;
}

interface DashboardData {
  profile: User;
  podcasts: {
    id: string;
    title: string;
    status: string;
    subscriberCount: number;
    totalPlays: number;
    createdAt: string;
  }[];
  stats: {
    podcastSeries: number;
    podcastEpisodes: number;
    points: number;
    favorites: number;
  };
}

const ALL_ROLES = [
  { id: "super_admin", label: "Super Admin", color: "bg-red-600" },
  { id: "role_admin", label: "Admin", color: "bg-purple-600" },
  { id: "editor", label: "Editor", color: "bg-blue-600" },
  { id: "content_creator", label: "Content Creator", color: "bg-teal-600" },
  { id: "host", label: "Host/DJ", color: "bg-orange-600" },
  { id: "listener", label: "Listener", color: "bg-gray-500" },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Impersonation state
  const [viewingUser, setViewingUser] = useState<DashboardData | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  // Role editing state
  const [editingRolesUser, setEditingRolesUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiClient<{ data: User[]; meta: any }>("/users");
      const list = data?.data ?? (Array.isArray(data) ? data : []);
      setUsers(list);
    } catch (err) {
      toast.error("Failed to load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(user: User) {
    setSubmitting(true);
    try {
      await apiClient(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      toast.success(
        `User ${!user.isActive ? "activated" : "deactivated"} successfully`
      );
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update user status");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function viewAsUser(user: User) {
    setImpersonating(true);
    try {
      const data = await apiClient<DashboardData>(
        `/users/${user.id}/impersonate`,
        { method: "POST" }
      );
      setViewingUser(data);
      toast.success(`Viewing as ${user.email}`);
    } catch (err) {
      toast.error("Failed to impersonate user. You may not have super admin privileges.");
      console.error(err);
    } finally {
      setImpersonating(false);
    }
  }

  async function endImpersonation() {
    if (viewingUser) {
      try {
        await apiClient(`/users/${viewingUser.profile.id}/impersonate/end`, {
          method: "POST",
        });
      } catch {
        // silently fail
      }
    }
    setViewingUser(null);
  }

  function openRoleEditor(user: User) {
    setEditingRolesUser(user);
    setSelectedRoles(getUserRoles(user));
  }

  async function saveRoles() {
    if (!editingRolesUser) return;
    setSubmitting(true);
    try {
      await apiClient(`/users/${editingRolesUser.id}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roles: selectedRoles }),
      });
      toast.success("Roles updated successfully");
      setEditingRolesUser(null);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update roles. You may not have super admin privileges.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  }

  function getUserRoles(user: User): string[] {
    if (user.roles && Array.isArray(user.roles)) return user.roles;
    if (user.role) return [user.role];
    return [];
  }

  function roleBadgeClass(role: string) {
    const found = ALL_ROLES.find((r) => r.id === role);
    return found ? `${found.color} hover:${found.color}` : "";
  }

  // ── Impersonation View ──
  if (viewingUser) {
    return (
      <div className="space-y-6">
        {/* Impersonation banner */}
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Eye className="size-5 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Viewing as: {viewingUser.profile.email}
              </p>
              <p className="text-xs text-amber-300/60">
                {viewingUser.profile.displayName || "No display name"} &middot;
                Roles: {getUserRoles(viewingUser.profile).join(", ") || "none"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={endImpersonation}
            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
          >
            <X className="size-4 mr-1" />
            Exit View
          </Button>
        </div>

        {/* User stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Podcast Series" value={viewingUser.stats.podcastSeries} />
          <StatCard label="Episodes" value={viewingUser.stats.podcastEpisodes} />
          <StatCard label="Points" value={viewingUser.stats.points} />
          <StatCard label="Favorites" value={viewingUser.stats.favorites} />
        </div>

        {/* Podcasts */}
        {viewingUser.podcasts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Podcast Series</h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribers</TableHead>
                    <TableHead>Total Plays</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingUser.podcasts.map((pod) => (
                    <TableRow key={pod.id}>
                      <TableCell className="font-medium">{pod.title}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            pod.status === "ACTIVE"
                              ? "bg-green-600"
                              : "bg-gray-500"
                          }
                        >
                          {pod.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{pod.subscriberCount}</TableCell>
                      <TableCell>{pod.totalPlays}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(pod.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {viewingUser.podcasts.length === 0 && (
          <div className="rounded-lg border p-8">
            <p className="text-center text-muted-foreground">
              This user has no podcast series.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Main Users List ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            No users found.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roles = getUserRoles(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.displayName || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roles.length > 0 ? (
                          roles.map((role) => (
                            <Badge
                              key={role}
                              className={roleBadgeClass(role)}
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.isActive
                            ? "bg-green-600 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-500"
                        }
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => viewAsUser(user)}
                            disabled={impersonating}
                          >
                            <Eye className="size-4" />
                            View as User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openRoleEditor(user)}
                          >
                            <UserCog className="size-4" />
                            Edit Roles
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleActive(user)}
                            disabled={submitting}
                          >
                            {user.isActive ? (
                              <>
                                <ShieldOff className="size-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="size-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Role Editor Dialog */}
      <Dialog
        open={!!editingRolesUser}
        onOpenChange={(open) => !open && setEditingRolesUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Roles — {editingRolesUser?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {ALL_ROLES.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="rounded"
                />
                <Badge className={`${role.color} hover:${role.color}`}>
                  {role.label}
                </Badge>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRolesUser(null)}
            >
              Cancel
            </Button>
            <Button onClick={saveRoles} disabled={submitting}>
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#141420] p-4">
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
