"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";

// ---- Points Rules ----

const ruleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  triggerType: z.string().min(1, "Trigger type is required"),
  pointsAmount: z.number().int().min(1, "Must be at least 1"),
  threshold: z.number().int().min(0),
  isActive: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface PointsRule extends RuleFormValues {
  id: string;
  createdAt?: string;
}

// ---- Rewards ----

const rewardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pointsCost: z.number().int().min(1, "Must be at least 1"),
  stockCount: z.number().int().min(0),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean(),
});

type RewardFormValues = z.infer<typeof rewardSchema>;

interface Reward extends RewardFormValues {
  id: string;
  createdAt?: string;
}

export default function AdminPointsPage() {
  // ---- Points Rules State ----
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [deleteRuleDialogOpen, setDeleteRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PointsRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<PointsRule | null>(null);

  // ---- Rewards State ----
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [deleteRewardDialogOpen, setDeleteRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [deletingReward, setDeletingReward] = useState<Reward | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ---- Forms ----
  const ruleForm = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      triggerType: "",
      pointsAmount: 10,
      threshold: 0,
      isActive: true,
    },
  });

  const rewardForm = useForm<RewardFormValues>({
    resolver: zodResolver(rewardSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsCost: 100,
      stockCount: 0,
      category: "",
      imageUrl: "",
      isActive: true,
    },
  });

  // ---- Fetch ----
  const fetchRules = useCallback(async () => {
    try {
      const data = await apiClient<PointsRule[]>("/points/rules");
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load points rules");
      console.error(err);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const fetchRewards = useCallback(async () => {
    try {
      const data = await apiClient<Reward[]>("/rewards");
      setRewards(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load rewards");
      console.error(err);
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchRewards();
  }, [fetchRules, fetchRewards]);

  // ---- Rules CRUD ----
  function openCreateRule() {
    setEditingRule(null);
    ruleForm.reset({
      name: "",
      triggerType: "",
      pointsAmount: 10,
      threshold: 0,
      isActive: true,
    });
    setRuleDialogOpen(true);
  }

  function openEditRule(rule: PointsRule) {
    setEditingRule(rule);
    ruleForm.reset({
      name: rule.name,
      triggerType: rule.triggerType,
      pointsAmount: rule.pointsAmount,
      threshold: rule.threshold,
      isActive: rule.isActive,
    });
    setRuleDialogOpen(true);
  }

  async function onSubmitRule(values: RuleFormValues) {
    setSubmitting(true);
    try {
      if (editingRule) {
        await apiClient(`/points/rules/${editingRule.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        toast.success("Rule updated successfully");
      } else {
        await apiClient("/points/rules", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success("Rule created successfully");
      }
      setRuleDialogOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(
        editingRule ? "Failed to update rule" : "Failed to create rule"
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRule() {
    if (!deletingRule) return;
    setSubmitting(true);
    try {
      await apiClient(`/points/rules/${deletingRule.id}`, {
        method: "DELETE",
      });
      toast.success("Rule deleted successfully");
      setDeleteRuleDialogOpen(false);
      setDeletingRule(null);
      fetchRules();
    } catch (err) {
      toast.error("Failed to delete rule");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Rewards CRUD ----
  function openCreateReward() {
    setEditingReward(null);
    rewardForm.reset({
      name: "",
      description: "",
      pointsCost: 100,
      stockCount: 0,
      category: "",
      imageUrl: "",
      isActive: true,
    });
    setRewardDialogOpen(true);
  }

  function openEditReward(reward: Reward) {
    setEditingReward(reward);
    rewardForm.reset({
      name: reward.name,
      description: reward.description ?? "",
      pointsCost: reward.pointsCost,
      stockCount: reward.stockCount,
      category: reward.category ?? "",
      imageUrl: reward.imageUrl ?? "",
      isActive: reward.isActive,
    });
    setRewardDialogOpen(true);
  }

  async function onSubmitReward(values: RewardFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        imageUrl: values.imageUrl || undefined,
        category: values.category || undefined,
        description: values.description || undefined,
      };

      if (editingReward) {
        await apiClient(`/rewards/${editingReward.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Reward updated successfully");
      } else {
        await apiClient("/rewards", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Reward created successfully");
      }
      setRewardDialogOpen(false);
      fetchRewards();
    } catch (err) {
      toast.error(
        editingReward ? "Failed to update reward" : "Failed to create reward"
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReward() {
    if (!deletingReward) return;
    setSubmitting(true);
    try {
      await apiClient(`/rewards/${deletingReward.id}`, { method: "DELETE" });
      toast.success("Reward deleted successfully");
      setDeleteRewardDialogOpen(false);
      setDeletingReward(null);
      fetchRewards();
    } catch (err) {
      toast.error("Failed to delete reward");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Points & Rewards
      </h1>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Points Rules</TabsTrigger>
          <TabsTrigger value="rewards">Rewards Catalog</TabsTrigger>
        </TabsList>

        {/* Points Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Points Rules</h2>
            <Button onClick={openCreateRule} size="sm">
              <Plus className="size-4" />
              Add Rule
            </Button>
          </div>

          {loadingRules ? (
            <div className="rounded-lg border p-8">
              <p className="text-center text-muted-foreground">Loading...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-lg border p-8">
              <p className="text-center text-muted-foreground">
                No points rules configured.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.triggerType}</Badge>
                      </TableCell>
                      <TableCell>{rule.pointsAmount}</TableCell>
                      <TableCell>{rule.threshold}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            rule.isActive
                              ? "bg-green-600 hover:bg-green-600"
                              : "bg-gray-500 hover:bg-gray-500"
                          }
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditRule(rule)}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeletingRule(rule);
                                setDeleteRuleDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Rewards Catalog Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Rewards Catalog</h2>
            <Button onClick={openCreateReward} size="sm">
              <Plus className="size-4" />
              Add Reward
            </Button>
          </div>

          {loadingRewards ? (
            <div className="rounded-lg border p-8">
              <p className="text-center text-muted-foreground">Loading...</p>
            </div>
          ) : rewards.length === 0 ? (
            <div className="rounded-lg border p-8">
              <p className="text-center text-muted-foreground">
                No rewards in the catalog.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell className="font-medium">
                        {reward.name}
                      </TableCell>
                      <TableCell>{reward.pointsCost}</TableCell>
                      <TableCell>{reward.stockCount}</TableCell>
                      <TableCell>
                        {reward.category ? (
                          <Badge variant="outline">{reward.category}</Badge>
                        ) : (
                          "\u2014"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            reward.isActive
                              ? "bg-green-600 hover:bg-green-600"
                              : "bg-gray-500 hover:bg-gray-500"
                          }
                        >
                          {reward.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditReward(reward)}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeletingReward(reward);
                                setDeleteRewardDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---- Rules Dialogs ---- */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Points Rule" : "Add Points Rule"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update the points rule details."
                : "Configure a new points earning rule."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="rule-form"
            onSubmit={ruleForm.handleSubmit(onSubmitRule)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input id="rule-name" {...ruleForm.register("name")} />
              {ruleForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {ruleForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Input
                id="triggerType"
                placeholder="e.g. LISTEN, EVENT_ATTEND, SHARE"
                {...ruleForm.register("triggerType")}
              />
              {ruleForm.formState.errors.triggerType && (
                <p className="text-sm text-destructive">
                  {ruleForm.formState.errors.triggerType.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pointsAmount">Points Amount</Label>
                <Input
                  id="pointsAmount"
                  type="number"
                  {...ruleForm.register("pointsAmount")}
                />
                {ruleForm.formState.errors.pointsAmount && (
                  <p className="text-sm text-destructive">
                    {ruleForm.formState.errors.pointsAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  {...ruleForm.register("threshold")}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rule-isActive"
                className="size-4 rounded border"
                {...ruleForm.register("isActive")}
              />
              <Label htmlFor="rule-isActive">Active</Label>
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRuleDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="rule-form" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingRule
                  ? "Update Rule"
                  : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRuleDialogOpen} onOpenChange={setDeleteRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Points Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingRule?.name}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteRuleDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRule}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Rewards Dialogs ---- */}
      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "Edit Reward" : "Add Reward"}
            </DialogTitle>
            <DialogDescription>
              {editingReward
                ? "Update the reward details."
                : "Add a new reward to the catalog."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="reward-form"
            onSubmit={rewardForm.handleSubmit(onSubmitReward)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reward-name">Name</Label>
              <Input id="reward-name" {...rewardForm.register("name")} />
              {rewardForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {rewardForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-description">Description</Label>
              <Textarea
                id="reward-description"
                {...rewardForm.register("description")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pointsCost">Points Cost</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  {...rewardForm.register("pointsCost")}
                />
                {rewardForm.formState.errors.pointsCost && (
                  <p className="text-sm text-destructive">
                    {rewardForm.formState.errors.pointsCost.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockCount">Stock</Label>
                <Input
                  id="stockCount"
                  type="number"
                  {...rewardForm.register("stockCount")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-category">Category</Label>
                <Input
                  id="reward-category"
                  placeholder="e.g. MERCH, TICKET"
                  {...rewardForm.register("category")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-imageUrl">Image URL</Label>
              <Input
                id="reward-imageUrl"
                placeholder="https://..."
                {...rewardForm.register("imageUrl")}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reward-isActive"
                className="size-4 rounded border"
                {...rewardForm.register("isActive")}
              />
              <Label htmlFor="reward-isActive">Active</Label>
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRewardDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="reward-form" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingReward
                  ? "Update Reward"
                  : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteRewardDialogOpen}
        onOpenChange={setDeleteRewardDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingReward?.name}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteRewardDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReward}
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
