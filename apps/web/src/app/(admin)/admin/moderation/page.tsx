"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  Store,
  Music,
  Podcast,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType = "COMMENT" | "LISTING" | "MIX" | "PODCAST" | "EVENT";
type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ModerationItem {
  id: string;
  contentType: ContentType;
  contentId: string;
  contentPreview: string;
  contentBody?: string;
  reportedBy?: { email: string; displayName?: string };
  reportedById?: string;
  reviewer?: { email: string; displayName?: string };
  reviewNotes?: string;
  status: ModerationStatus;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function statusBadgeClass(status: ModerationStatus) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500 hover:bg-yellow-500 text-white";
    case "APPROVED":
      return "bg-green-600 hover:bg-green-600";
    case "REJECTED":
      return "bg-red-600 hover:bg-red-600";
    default:
      return "";
  }
}

function contentTypeIcon(type: ContentType) {
  switch (type) {
    case "COMMENT":
      return MessageSquare;
    case "LISTING":
      return Store;
    case "MIX":
      return Music;
    case "PODCAST":
      return Podcast;
    case "EVENT":
      return CalendarDays;
    default:
      return Shield;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ---------- Data fetching ----------

  const fetchItems = useCallback(async () => {
    try {
      const data = await apiClient<ModerationItem[]>("/moderation");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load moderation queue");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---------- Filtered views ----------

  const filteredItems =
    activeTab === "ALL"
      ? items
      : items.filter((item) => item.status === activeTab);

  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const approvedTodayCount = items.filter((i) => {
    if (i.status !== "APPROVED") return false;
    const updated = i.updatedAt ?? i.createdAt;
    return new Date(updated).toDateString() === new Date().toDateString();
  }).length;
  const rejectedTodayCount = items.filter((i) => {
    if (i.status !== "REJECTED") return false;
    const updated = i.updatedAt ?? i.createdAt;
    return new Date(updated).toDateString() === new Date().toDateString();
  }).length;
  const totalReviewed = items.filter(
    (i) => i.status === "APPROVED" || i.status === "REJECTED"
  ).length;

  // ---------- Single review ----------

  async function openReviewDialog(item: ModerationItem) {
    setSelectedItem(item);
    setReviewNotes(item.reviewNotes ?? "");
    setReviewDialogOpen(true);
    setLoadingDetail(true);
    try {
      const detail = await apiClient<ModerationItem>(
        `/moderation/${item.id}`
      );
      setSelectedItem(detail);
    } catch {
      // keep the item we already have
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleReview(status: "APPROVED" | "REJECTED") {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await apiClient(`/moderation/${selectedItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewNotes }),
      });
      toast.success(
        `Content ${status === "APPROVED" ? "approved" : "rejected"} successfully`
      );
      setReviewDialogOpen(false);
      setSelectedItem(null);
      setReviewNotes("");
      fetchItems();
    } catch (err) {
      toast.error("Failed to update moderation status");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Bulk actions ----------

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = filteredItems.map((i) => i.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }

  async function bulkAction(status: "APPROVED" | "REJECTED") {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await apiClient(`/moderation/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (successCount > 0) {
      toast.success(
        `${successCount} item${successCount > 1 ? "s" : ""} ${status === "APPROVED" ? "approved" : "rejected"}`
      );
    }
    if (failCount > 0) {
      toast.error(`Failed to update ${failCount} item${failCount > 1 ? "s" : ""}`);
    }
    setSelectedIds(new Set());
    setSubmitting(false);
    fetchItems();
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Moderation Queue</h1>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reviews
            </CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Today
            </CardTitle>
            <CheckCircle className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedTodayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Rejected Today
            </CardTitle>
            <XCircle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedTodayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reviewed
            </CardTitle>
            <Eye className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviewed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="ALL">
              All ({items.length})
            </TabsTrigger>
            <TabsTrigger value="PENDING">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Approved ({items.filter((i) => i.status === "APPROVED").length})
            </TabsTrigger>
            <TabsTrigger value="REJECTED">
              Rejected ({items.filter((i) => i.status === "REJECTED").length})
            </TabsTrigger>
          </TabsList>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkAction("APPROVED")}
                disabled={submitting}
              >
                <CheckCircle className="mr-1 size-4" />
                Approve All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkAction("REJECTED")}
                disabled={submitting}
              >
                <XCircle className="mr-1 size-4" />
                Reject All
              </Button>
            </div>
          )}
        </div>

        {/* Shared content for all tabs */}
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="rounded-lg border p-8">
                <p className="text-center text-muted-foreground">Loading...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-lg border p-8">
                <p className="text-center text-muted-foreground">
                  No moderation items found.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-gray-300"
                          checked={
                            filteredItems.length > 0 &&
                            filteredItems.every((i) => selectedIds.has(i.id))
                          }
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="min-w-[200px]">
                        Content Preview
                      </TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const Icon = contentTypeIcon(item.contentType);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="size-4 rounded border-gray-300"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelect(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4 text-muted-foreground" />
                              <span className="text-sm">
                                {item.contentType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-[300px] truncate text-sm">
                              {item.contentPreview}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.reportedBy?.displayName ||
                              item.reportedBy?.email ||
                              "\u2014"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusBadgeClass(item.status)}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReviewDialog(item)}
                              >
                                <Eye className="mr-1 size-4" />
                                Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Content</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? `${selectedItem.contentType} - submitted ${formatDate(selectedItem.createdAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedItem ? (
            <div className="space-y-4">
              {/* Content type & status */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedItem.contentType}</Badge>
                <Badge className={statusBadgeClass(selectedItem.status)}>
                  {selectedItem.status}
                </Badge>
              </div>

              {/* Full content */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedItem.contentBody ?? selectedItem.contentPreview}
                </p>
              </div>

              {/* Reported by */}
              {selectedItem.reportedBy && (
                <div className="text-sm text-muted-foreground">
                  Reported by:{" "}
                  <span className="font-medium text-foreground">
                    {selectedItem.reportedBy.displayName ??
                      selectedItem.reportedBy.email}
                  </span>
                </div>
              )}

              {/* Review notes */}
              <div className="space-y-2">
                <label
                  htmlFor="review-notes"
                  className="text-sm font-medium leading-none"
                >
                  Review Notes
                </label>
                <Textarea
                  id="review-notes"
                  placeholder="Add optional notes about this decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedItem?.status === "PENDING" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleReview("REJECTED")}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-1 size-4" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview("APPROVED")}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1 size-4" />
                  )}
                  Approve
                </Button>
              </>
            )}
            {selectedItem?.status !== "PENDING" && (
              <Button
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
