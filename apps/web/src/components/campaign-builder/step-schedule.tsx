"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import type { CampaignFormValues, DaypartOrderValues } from "./campaign-builder-types";
import {
  WEEKDAY_DAYPARTS,
  SATURDAY_DAYPARTS,
  SUNDAY_DAYPARTS,
  MIX_SHOW_RATES,
  ROS_RATE,
  REMOTE_PACKAGES,
  DUKE_SPORTS,
  getDaypartsForDay,
  formatHourRange,
  type DayCategory,
  type RateCardDaypart,
  type RemoteBroadcastPackage,
} from "@/data/rate-card";
import { formatCurrency, computeWeeks } from "@/lib/sales-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Radio, Clock, DollarSign, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Shared toggle-button styling
// ---------------------------------------------------------------------------
const toggleBtnBase =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer select-none";
const toggleBtnOn = "bg-[#74ddc7] text-[#0a0a0f]";
const toggleBtnOff = "bg-muted text-muted-foreground hover:bg-muted/80";

function ToggleButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${toggleBtnBase} ${active ? toggleBtnOn : toggleBtnOff} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helper: format an hour number to "6:00 AM" style
// ---------------------------------------------------------------------------
function formatHourLabel(h: number): string {
  if (h === 0 || h === 24) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

// ---------------------------------------------------------------------------
// Helper: build default break slots for a daypart
// ---------------------------------------------------------------------------
function buildBreakSlots(daypart: RateCardDaypart) {
  const slots: { hour: number; break18: boolean; break48: boolean }[] = [];
  for (let h = daypart.startHour; h < daypart.endHour; h++) {
    slots.push({ hour: h, break18: false, break48: false });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Helper: count total breaks checked in break slots
// ---------------------------------------------------------------------------
function countBreaks(
  slots: { hour: number; break18: boolean; break48: boolean }[],
): number {
  return slots.reduce(
    (sum, s) => sum + (s.break18 ? 1 : 0) + (s.break48 ? 1 : 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Shared flight header (name, dates, weeks)
// ---------------------------------------------------------------------------
function FlightHeader() {
  const { register, watch } = useFormContext<CampaignFormValues>();
  const flightStart = watch("flightStart");
  const flightEnd = watch("flightEnd");
  const weeks = computeWeeks(flightStart, flightEnd);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-[#74ddc7]" />
          Campaign Flight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-foreground">
            Campaign Name
          </Label>
          <Input
            {...register("campaignName")}
            placeholder="e.g. Summer 2025 Drive-Time Push"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Flight Start
            </Label>
            <Input type="date" {...register("flightStart")} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">
              Flight End
            </Label>
            <Input type="date" {...register("flightEnd")} className="mt-1" />
          </div>
          <div className="flex flex-col justify-end">
            <div className="rounded-md bg-muted px-3 py-2 text-center text-sm font-medium text-foreground">
              {weeks > 0 ? (
                <>
                  <span className="text-[#74ddc7]">{weeks}</span>{" "}
                  {weeks === 1 ? "week" : "weeks"}
                </>
              ) : (
                <span className="text-muted-foreground">Select dates</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// ON-AIR schedule panel
// ===========================================================================

function OnAirPanel() {
  const { watch, setValue, control, register } =
    useFormContext<CampaignFormValues>();

  const selectedDays = watch("selectedDays") as DayCategory[];
  const includeMixShows = watch("includeMixShows");
  const mixShowSelections = watch("mixShowSelections");
  const flightStart = watch("flightStart");
  const flightEnd = watch("flightEnd");
  const weeks = computeWeeks(flightStart, flightEnd);

  const { fields, replace } = useFieldArray({
    control,
    name: "daypartOrders",
  });

  // -----------------------------------------------------------------------
  // When selectedDays changes, rebuild daypartOrders from rate card
  // -----------------------------------------------------------------------
  const syncDaypartOrders = useCallback(
    (days: DayCategory[]) => {
      const currentOrders = watch("daypartOrders");
      const existingMap = new Map<string, DaypartOrderValues>();
      for (const order of currentOrders) {
        existingMap.set(order.daypartId, order);
      }

      const newOrders: DaypartOrderValues[] = [];
      for (const day of days) {
        const dayparts = getDaypartsForDay(day);
        for (const dp of dayparts) {
          const existing = existingMap.get(dp.id);
          if (existing) {
            newOrders.push(existing);
          } else {
            newOrders.push({
              daypartId: dp.id,
              dayCategory: day,
              showName: dp.showName,
              rate: dp.ratePerSpot,
              spotLength: 60,
              orderType: "non_specific",
              spotsPerWeek: 0,
              breakSlots: buildBreakSlots(dp),
            });
          }
        }
      }
      replace(newOrders);
    },
    [replace, watch],
  );

  // Initial sync
  useEffect(() => {
    syncDaypartOrders(selectedDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Day toggle handler
  // -----------------------------------------------------------------------
  function toggleDay(day: DayCategory) {
    const current = [...selectedDays];
    const idx = current.indexOf(day);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(day);
    }
    setValue("selectedDays", current);
    syncDaypartOrders(current);
  }

  // -----------------------------------------------------------------------
  // Per-field helpers
  // -----------------------------------------------------------------------
  function setFieldValue(
    index: number,
    key: keyof DaypartOrderValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
  ) {
    // react-hook-form generic path types are overly strict for dynamic keys,
    // so we cast the path to satisfy the constraint.
    setValue(
      `daypartOrders.${index}.${key}` as `daypartOrders.${number}.rate`,
      value,
    );
  }

  function toggleBreak(
    fieldIndex: number,
    slotIndex: number,
    breakKey: "break18" | "break48",
  ) {
    const order = watch(`daypartOrders.${fieldIndex}`);
    const slots = [...order.breakSlots];
    slots[slotIndex] = {
      ...slots[slotIndex],
      [breakKey]: !slots[slotIndex][breakKey],
    };
    setValue(`daypartOrders.${fieldIndex}.breakSlots`, slots);
    // Auto-compute spotsPerWeek from checked breaks
    const total = countBreaks(slots);
    setValue(`daypartOrders.${fieldIndex}.spotsPerWeek`, total);
  }

  // -----------------------------------------------------------------------
  // Running total
  // -----------------------------------------------------------------------
  const daypartOrders = watch("daypartOrders");

  const weeklyTotal = daypartOrders.reduce(
    (sum, o) => sum + o.rate * o.spotsPerWeek,
    0,
  );

  const mixShowTotal = includeMixShows
    ? MIX_SHOW_RATES.filter(
        (m) => selectedDays.includes(m.dayCategory) && mixShowSelections.includes(m.id),
      ).reduce((sum, m) => sum + m.ratePerSegment, 0)
    : 0;

  const grandWeekly = weeklyTotal + mixShowTotal;
  const grandTotal = grandWeekly * Math.max(weeks, 1);

  // -----------------------------------------------------------------------
  // Group fields by dayCategory for rendering
  // -----------------------------------------------------------------------
  const dayLabels: Record<DayCategory, string> = {
    weekday: "Weekday (Mon-Fri)",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return (
    <div className="space-y-6">
      {/* Day selector */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-[#74ddc7]" />
            Day Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(["weekday", "saturday", "sunday"] as DayCategory[]).map((day) => (
              <ToggleButton
                key={day}
                active={selectedDays.includes(day)}
                onClick={() => toggleDay(day)}
              >
                {dayLabels[day]}
              </ToggleButton>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daypart orders */}
      {selectedDays.map((day) => {
        const daypartsForDay = getDaypartsForDay(day);
        return (
          <Card key={day} className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {dayLabels[day]} Dayparts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {daypartsForDay.map((dp) => {
                const fieldIndex = fields.findIndex(
                  (f) => f.daypartId === dp.id,
                );
                if (fieldIndex < 0) return null;

                const order = daypartOrders[fieldIndex];
                if (!order) return null;

                return (
                  <div
                    key={dp.id}
                    className="rounded-lg border border-border bg-background p-4 space-y-3"
                  >
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {dp.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dp.showName} &middot;{" "}
                          {formatHourRange(dp.startHour, dp.endHour)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(order.rate)}/spot
                      </Badge>
                    </div>

                    {/* Controls row */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Rate */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Rate / Spot
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={order.rate}
                          onChange={(e) =>
                            setFieldValue(
                              fieldIndex,
                              "rate",
                              Number(e.target.value) || 0,
                            )
                          }
                          className="mt-1 h-8 text-sm"
                        />
                      </div>

                      {/* Spot length */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Spot Length
                        </Label>
                        <div className="mt-1 flex gap-1">
                          {([15, 30, 60] as const).map((len) => (
                            <ToggleButton
                              key={len}
                              active={order.spotLength === len}
                              onClick={() =>
                                setFieldValue(fieldIndex, "spotLength", len)
                              }
                              className="h-8 px-2 text-xs"
                            >
                              {len}s
                            </ToggleButton>
                          ))}
                        </div>
                      </div>

                      {/* Order type */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Order Type
                        </Label>
                        <div className="mt-1 flex gap-1">
                          <ToggleButton
                            active={order.orderType === "non_specific"}
                            onClick={() =>
                              setFieldValue(
                                fieldIndex,
                                "orderType",
                                "non_specific",
                              )
                            }
                            className="h-8 px-2 text-xs"
                          >
                            ROS
                          </ToggleButton>
                          <ToggleButton
                            active={order.orderType === "specific"}
                            onClick={() =>
                              setFieldValue(
                                fieldIndex,
                                "orderType",
                                "specific",
                              )
                            }
                            className="h-8 px-2 text-xs"
                          >
                            Specific
                          </ToggleButton>
                        </div>
                      </div>

                      {/* Spots per week (for ROS mode) */}
                      {order.orderType === "non_specific" && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Spots / Week
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={order.spotsPerWeek}
                            onChange={(e) =>
                              setFieldValue(
                                fieldIndex,
                                "spotsPerWeek",
                                Number(e.target.value) || 0,
                              )
                            }
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Break position grid (for Specific mode) */}
                    {order.orderType === "specific" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Break Positions — Select which :18 and :48 breaks to
                          place spots in
                        </Label>
                        <div className="rounded-md border border-border bg-muted/30 p-3">
                          {/* Header */}
                          <div className="mb-2 grid grid-cols-[1fr_60px_60px] items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span>Hour</span>
                            <span className="text-center">:18</span>
                            <span className="text-center">:48</span>
                          </div>
                          {/* Rows */}
                          {order.breakSlots.map((slot, slotIdx) => (
                            <div
                              key={slot.hour}
                              className="grid grid-cols-[1fr_60px_60px] items-center gap-2 border-t border-border/50 py-1.5"
                            >
                              <span className="text-sm text-foreground">
                                {formatHourLabel(slot.hour)}
                              </span>
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleBreak(fieldIndex, slotIdx, "break18")
                                  }
                                  className={`h-6 w-6 rounded border transition-colors ${
                                    slot.break18
                                      ? "border-[#74ddc7] bg-[#74ddc7] text-[#0a0a0f]"
                                      : "border-border bg-background text-transparent hover:border-muted-foreground"
                                  } flex items-center justify-center`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleBreak(fieldIndex, slotIdx, "break48")
                                  }
                                  className={`h-6 w-6 rounded border transition-colors ${
                                    slot.break48
                                      ? "border-[#74ddc7] bg-[#74ddc7] text-[#0a0a0f]"
                                      : "border-border bg-background text-transparent hover:border-muted-foreground"
                                  } flex items-center justify-center`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {/* Break count summary */}
                          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                            <span className="text-muted-foreground">
                              Breaks selected
                            </span>
                            <span className="font-medium text-[#74ddc7]">
                              {order.spotsPerWeek} spots / week
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Weekly subtotal */}
                    <div className="flex items-center justify-end gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Weekly subtotal:
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(order.rate * order.spotsPerWeek)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Mix Shows */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-[#74ddc7]" />
            Mix Shows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <ToggleButton
              active={includeMixShows}
              onClick={() => {
                const next = !includeMixShows;
                setValue("includeMixShows", next);
                if (!next) setValue("mixShowSelections", []);
              }}
            >
              {includeMixShows ? "Included" : "Include Mix Shows"}
            </ToggleButton>
            {includeMixShows && (
              <span className="text-xs text-muted-foreground">
                Select mix show segments below
              </span>
            )}
          </div>

          {includeMixShows && (
            <div className="space-y-2">
              {MIX_SHOW_RATES.filter((m) =>
                selectedDays.includes(m.dayCategory),
              ).map((mix) => {
                const isSelected = mixShowSelections.includes(mix.id);
                return (
                  <button
                    type="button"
                    key={mix.id}
                    onClick={() => {
                      const current = [...mixShowSelections];
                      const idx = current.indexOf(mix.id);
                      if (idx >= 0) {
                        current.splice(idx, 1);
                      } else {
                        current.push(mix.id);
                      }
                      setValue("mixShowSelections", current);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-[#74ddc7] bg-[#74ddc7]/10"
                        : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {mix.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mix.showName} &middot; {mix.times.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(mix.ratePerSegment)}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-[#74ddc7]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Running total */}
      <Card className="border-[#74ddc7]/30 bg-card">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Daypart spots weekly
              </span>
              <span className="text-foreground">
                {formatCurrency(weeklyTotal)}
              </span>
            </div>
            {includeMixShows && mixShowTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mix shows weekly
                </span>
                <span className="text-foreground">
                  {formatCurrency(mixShowTotal)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly total</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(grandWeekly)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Campaign total ({weeks > 0 ? `${weeks} wk` : "0 wk"})
              </span>
              <span className="text-lg font-bold text-[#74ddc7]">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// REMOTE BROADCAST panel
// ===========================================================================

function RemoteBroadcastPanel() {
  const { watch, setValue } = useFormContext<CampaignFormValues>();
  const remotePackageId = watch("remotePackageId");
  const includePersonality = watch("remoteIncludePersonality");
  const includeDj = watch("remoteIncludeDj");

  const selectedPkg = REMOTE_PACKAGES.find((p) => p.id === remotePackageId);
  const personalityFee = includePersonality
    ? (selectedPkg?.personalityFee ?? 150)
    : 0;
  const djFee = includeDj ? (selectedPkg?.optionalDjFee ?? 200) : 0;
  const baseRate = selectedPkg?.baseRate ?? 0;
  const total = baseRate + personalityFee + djFee;

  return (
    <div className="space-y-6">
      {/* Package selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REMOTE_PACKAGES.map((pkg) => {
          const isSelected = remotePackageId === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setValue("remotePackageId", pkg.id)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                isSelected
                  ? "border-[#74ddc7] bg-[#74ddc7]/5"
                  : "border-border bg-card hover:border-muted-foreground/50"
              }`}
            >
              <p className="text-base font-semibold text-foreground">
                {pkg.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pkg.description}
              </p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  {pkg.callbackHours} hrs &middot; {pkg.spots} spots &middot;{" "}
                  {pkg.liveLinerCount} live liners
                </p>
                <p className="font-medium text-foreground">
                  Base: {formatCurrency(pkg.baseRate)}
                </p>
              </div>
              {isSelected && (
                <div className="mt-2 flex justify-end">
                  <Check className="h-5 w-5 text-[#74ddc7]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Add-ons */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add-ons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() =>
              setValue("remoteIncludePersonality", !includePersonality)
            }
            className={`flex w-full items-center justify-between rounded-lg border p-3 transition-colors ${
              includePersonality
                ? "border-[#74ddc7] bg-[#74ddc7]/10"
                : "border-border bg-background hover:bg-muted/50"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Personality Fee
              </p>
              <p className="text-xs text-muted-foreground">
                On-air personality at remote location
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                +{formatCurrency(150)}
              </span>
              {includePersonality && (
                <Check className="h-4 w-4 text-[#74ddc7]" />
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setValue("remoteIncludeDj", !includeDj)}
            className={`flex w-full items-center justify-between rounded-lg border p-3 transition-colors ${
              includeDj
                ? "border-[#74ddc7] bg-[#74ddc7]/10"
                : "border-border bg-background hover:bg-muted/50"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">DJ Fee</p>
              <p className="text-xs text-muted-foreground">
                Additional DJ for music and mixing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                +{formatCurrency(200)}
              </span>
              {includeDj && <Check className="h-4 w-4 text-[#74ddc7]" />}
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Pricing summary */}
      {selectedPkg && (
        <Card className="border-[#74ddc7]/30 bg-card">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base package</span>
                <span className="text-foreground">
                  {formatCurrency(baseRate)}
                </span>
              </div>
              {includePersonality && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Personality fee
                  </span>
                  <span className="text-foreground">
                    {formatCurrency(personalityFee)}
                  </span>
                </div>
              )}
              {includeDj && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">DJ fee</span>
                  <span className="text-foreground">
                    {formatCurrency(djFee)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Total
                </span>
                <span className="text-lg font-bold text-[#74ddc7]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===========================================================================
// SPORTS SPONSORSHIP panel
// ===========================================================================

function SportsSponsorshipPanel() {
  const { watch, setValue } = useFormContext<CampaignFormValues>();
  const sportType = watch("sportType");
  const sportsPackages = watch("sportsPackages");

  // Default to football if nothing selected
  useEffect(() => {
    if (!sportType) {
      setValue("sportType", "football");
    }
  }, [sportType, setValue]);

  const currentSport =
    DUKE_SPORTS.find((s) => s.sport === sportType) ?? DUKE_SPORTS[0];

  function togglePackage(pkgId: string) {
    const current = [...sportsPackages];
    const idx = current.indexOf(pkgId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(pkgId);
    }
    setValue("sportsPackages", current);
  }

  const total = currentSport.packages
    .filter((p) => sportsPackages.includes(p.id))
    .reduce((sum, p) => sum + p.rate, 0);

  return (
    <div className="space-y-6">
      {/* Sport toggle */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Sport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {DUKE_SPORTS.map((s) => (
              <ToggleButton
                key={s.sport}
                active={sportType === s.sport}
                onClick={() => {
                  setValue("sportType", s.sport);
                  setValue("sportsPackages", []);
                }}
              >
                {s.label}
              </ToggleButton>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Packages */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentSport.packages.map((pkg) => {
          const isSelected = sportsPackages.includes(pkg.id);
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => togglePackage(pkg.id)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                isSelected
                  ? "border-[#74ddc7] bg-[#74ddc7]/5"
                  : "border-border bg-card hover:border-muted-foreground/50"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                {pkg.name}
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatCurrency(pkg.rate)}
              </p>
              {isSelected && (
                <div className="mt-2 flex justify-end">
                  <Check className="h-5 w-5 text-[#74ddc7]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Total */}
      <Card className="border-[#74ddc7]/30 bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {sportsPackages.length} package
              {sportsPackages.length !== 1 ? "s" : ""} selected
            </span>
            <span className="text-lg font-bold text-[#74ddc7]">
              {formatCurrency(total)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// DIGITAL panel
// ===========================================================================

const DIGITAL_PLACEMENT_OPTIONS = [
  { value: "website_banner", label: "Website Banner" },
  { value: "streaming_preroll", label: "Streaming Pre-Roll" },
  { value: "social_media", label: "Social Media" },
] as const;

function DigitalPanel() {
  const { watch, setValue, register } = useFormContext<CampaignFormValues>();
  const digitalPlacements = watch("digitalPlacements");
  const digitalBudget = watch("digitalBudget");

  function togglePlacement(value: string) {
    const current = [...digitalPlacements];
    const idx = current.indexOf(value);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(value);
    }
    setValue("digitalPlacements", current);
  }

  return (
    <div className="space-y-6">
      {/* Placements */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Digital Placements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DIGITAL_PLACEMENT_OPTIONS.map((opt) => {
            const isChecked = digitalPlacements.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => togglePlacement(opt.value)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isChecked
                    ? "border-[#74ddc7] bg-[#74ddc7]/10"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? "border-[#74ddc7] bg-[#74ddc7] text-[#0a0a0f]"
                      : "border-border bg-background"
                  }`}
                >
                  {isChecked && <Check className="h-3.5 w-3.5" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Budget */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-[#74ddc7]" />
            Campaign Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-sm font-medium text-foreground">
              Budget ($)
            </Label>
            <Input
              type="number"
              min={0}
              value={digitalBudget || ""}
              onChange={(e) =>
                setValue("digitalBudget", Number(e.target.value) || 0)
              }
              placeholder="Enter campaign budget"
              className="mt-1"
            />
          </div>
          {digitalBudget > 0 && (
            <div className="mt-3 flex items-center justify-end">
              <span className="text-lg font-bold text-[#74ddc7]">
                {formatCurrency(digitalBudget)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// PROMOTIONS panel
// ===========================================================================

const PROMOTION_TYPES = [
  "Contest",
  "Giveaway",
  "On-Air Mentions",
  "Sponsorship",
] as const;

function PromotionsPanel() {
  const { watch, setValue, register } = useFormContext<CampaignFormValues>();
  const promotionType = watch("promotionType");

  return (
    <div className="space-y-6">
      {/* Promotion type */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Promotion Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PROMOTION_TYPES.map((type) => (
              <ToggleButton
                key={type}
                active={promotionType === type}
                onClick={() => setValue("promotionType", type)}
              >
                {type}
              </ToggleButton>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-sm font-medium text-foreground">
            Promotion Details
          </Label>
          <Textarea
            {...register("promotionDescription")}
            placeholder="Describe the promotion, prizes, rules, and any special requirements..."
            className="mt-1 min-h-[120px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// MAIN EXPORT
// ===========================================================================

export function StepSchedule() {
  const { watch } = useFormContext<CampaignFormValues>();
  const campaignType = watch("campaignType");

  return (
    <div className="space-y-6">
      <FlightHeader />

      {campaignType === "on_air" && <OnAirPanel />}
      {campaignType === "remote_broadcast" && <RemoteBroadcastPanel />}
      {campaignType === "sports_sponsorship" && <SportsSponsorshipPanel />}
      {campaignType === "digital" && <DigitalPanel />}
      {campaignType === "promotions" && <PromotionsPanel />}
    </div>
  );
}
