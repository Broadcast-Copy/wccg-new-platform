"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

const blockSchema = z.object({
  stream_id: z.string().min(1, "Stream is required"),
  show_id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  is_override: z.boolean(),
  override_date: z.string().optional(),
  color: z.string().optional(),
});

type BlockFormValues = z.infer<typeof blockSchema>;

interface ScheduleBlock extends BlockFormValues {
  id: string;
  show?: { id: string; name: string };
  stream?: { id: string; name: string };
}

interface Stream {
  id: string;
  name: string;
  slug: string;
}

interface Show {
  id: string;
  name: string;
}

const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function timeToRow(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
}

function getBlockStyle(block: ScheduleBlock) {
  const startRow = timeToRow(block.start_time);
  const endRow = timeToRow(block.end_time);
  const height = Math.max(endRow - startRow, 1);

  return {
    top: `${startRow * 2}rem`,
    height: `${height * 2}rem`,
    backgroundColor: block.color || DEFAULT_COLORS[0],
  };
}

export default function AdminSchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<ScheduleBlock | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [selectedStream, setSelectedStream] = useState<string>("");

  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      stream_id: "",
      show_id: "",
      title: "",
      day_of_week: 0,
      start_time: "09:00",
      end_time: "10:00",
      is_override: false,
      override_date: "",
      color: DEFAULT_COLORS[0],
    },
  });

  const isOverride = form.watch("is_override");

  const fetchData = useCallback(async () => {
    try {
      const [streamsData, showsData] = await Promise.all([
        apiClient<Stream[]>("/streams").catch(() => []),
        apiClient<Show[]>("/shows").catch(() => []),
      ]);
      const safeStreams = Array.isArray(streamsData) ? streamsData : [];
      const safeShows = Array.isArray(showsData) ? showsData : [];
      setStreams(safeStreams);
      setShows(safeShows);

      // Set default selected stream
      if (safeStreams.length > 0 && !selectedStream) {
        setSelectedStream(safeStreams[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedStream]);

  const fetchBlocks = useCallback(async () => {
    if (!selectedStream) return;
    try {
      const data = await apiClient<ScheduleBlock[]>(
        `/schedule?streamId=${selectedStream}`
      );
      setBlocks(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load schedule");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStream]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedStream) {
      setLoading(true);
      fetchBlocks();
    }
  }, [selectedStream, fetchBlocks]);

  const blocksByDay = useMemo(() => {
    const map: Record<number, ScheduleBlock[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    blocks.forEach((b) => {
      if (map[b.day_of_week]) {
        map[b.day_of_week].push(b);
      }
    });
    return map;
  }, [blocks]);

  function openCreateDialog(dayOfWeek?: number) {
    setEditingBlock(null);
    form.reset({
      stream_id: selectedStream,
      show_id: "",
      title: "",
      day_of_week: dayOfWeek ?? 0,
      start_time: "09:00",
      end_time: "10:00",
      is_override: false,
      override_date: "",
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
    });
    setDialogOpen(true);
  }

  function openEditDialog(block: ScheduleBlock) {
    setEditingBlock(block);
    form.reset({
      stream_id: block.stream_id,
      show_id: block.show_id ?? "",
      title: block.title,
      day_of_week: block.day_of_week,
      start_time: block.start_time,
      end_time: block.end_time,
      is_override: block.is_override,
      override_date: block.override_date ?? "",
      color: block.color ?? DEFAULT_COLORS[0],
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: BlockFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        show_id: values.show_id || undefined,
        override_date: values.override_date || undefined,
        color: values.color || undefined,
      };

      if (editingBlock) {
        await apiClient(`/schedule/blocks/${editingBlock.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Block updated successfully");
      } else {
        await apiClient("/schedule/blocks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Block created successfully");
      }
      setDialogOpen(false);
      fetchBlocks();
    } catch (err) {
      toast.error(
        editingBlock ? "Failed to update block" : "Failed to create block"
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingBlock) return;
    setSubmitting(true);
    try {
      await apiClient(`/schedule/blocks/${deletingBlock.id}`, {
        method: "DELETE",
      });
      toast.success("Block deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingBlock(null);
      fetchBlocks();
    } catch (err) {
      toast.error("Failed to delete block");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Schedule Builder
          </h1>
          <p className="text-muted-foreground">
            Build the weekly schedule by adding time blocks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {streams.length > 0 && (
            <Select
              value={selectedStream}
              onValueChange={setSelectedStream}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select stream" />
              </SelectTrigger>
              <SelectContent>
                {streams.map((stream) => (
                  <SelectItem key={stream.id} value={stream.id}>
                    {stream.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => openCreateDialog()}>
            <Plus className="size-4" />
            Add Block
          </Button>
        </div>
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
              {/* Header row */}
              <div className="sticky top-0 z-10 border-b bg-muted/50 p-2 text-xs font-medium text-muted-foreground">
                Time
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="sticky top-0 z-10 border-b border-l bg-muted/50 p-2 text-xs font-medium text-center"
                >
                  {day}
                </div>
              ))}

              {/* Time column + day columns */}
              <div className="relative">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b px-1 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {hour}
                  </div>
                ))}
              </div>

              {DAYS.map((day, dayIndex) => (
                <div
                  key={day}
                  className="relative border-l cursor-pointer"
                  onClick={() => openCreateDialog(dayIndex)}
                >
                  {/* Hour lines */}
                  {HOURS.map((hour) => (
                    <div key={hour} className="h-16 border-b" />
                  ))}

                  {/* Schedule blocks */}
                  {blocksByDay[dayIndex]?.map((block) => (
                    <div
                      key={block.id}
                      className="absolute inset-x-1 rounded px-1.5 py-1 text-[11px] text-white shadow-sm cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
                      style={getBlockStyle(block)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(block);
                      }}
                    >
                      <div className="font-medium truncate">{block.title}</div>
                      <div className="truncate opacity-80">
                        {block.start_time} - {block.end_time}
                      </div>
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          className="rounded p-0.5 hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(block);
                          }}
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          className="rounded p-0.5 hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingBlock(block);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? "Edit Schedule Block" : "Add Schedule Block"}
            </DialogTitle>
            <DialogDescription>
              {editingBlock
                ? "Update the schedule block details."
                : "Add a new block to the schedule."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="block-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Stream</Label>
              <Select
                value={form.watch("stream_id")}
                onValueChange={(val) => form.setValue("stream_id", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.stream_id && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.stream_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Show (optional)</Label>
              <Select
                value={form.watch("show_id") || "none"}
                onValueChange={(val) =>
                  form.setValue("show_id", val === "none" ? "" : val)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No show</SelectItem>
                  {shows.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={String(form.watch("day_of_week"))}
                  onValueChange={(val) =>
                    form.setValue("day_of_week", parseInt(val))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...form.register("start_time")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  {...form.register("end_time")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    className="h-9 w-14 p-1"
                    {...form.register("color")}
                  />
                  <div className="flex gap-1">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={cn(
                          "size-6 rounded-full border-2",
                          form.watch("color") === c
                            ? "border-foreground"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => form.setValue("color", c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_override"
                className="size-4 rounded border"
                {...form.register("is_override")}
              />
              <Label htmlFor="is_override">Override (one-time slot)</Label>
            </div>

            {isOverride && (
              <div className="space-y-2">
                <Label htmlFor="override_date">Override Date</Label>
                <Input
                  id="override_date"
                  type="date"
                  {...form.register("override_date")}
                />
              </div>
            )}
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="block-form" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingBlock
                  ? "Update Block"
                  : "Create Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule Block</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingBlock?.title}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
