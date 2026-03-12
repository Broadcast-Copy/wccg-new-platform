"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import type {
  CampaignFormValues,
  DaypartOrderValues,
  FlightVariationValues,
  DayType,
} from "./campaign-builder-types";
import { DAY_TYPE_LABELS } from "./campaign-builder-types";
import {
  WEEKDAY_DAYPARTS,
  SATURDAY_DAYPARTS,
  SUNDAY_DAYPARTS,
  MIX_SHOW_RATES,
  ROS_RATE,
  REMOTE_PACKAGES,
  DUKE_SPORTS,
  PROMOTIONS_PACKAGES,
  getDaypartsForDay,
  formatHourRange,
  type DayCategory,
  type RateCardDaypart,
  type RemoteBroadcastPackage,
} from "@/data/rate-card";
import { formatCurrency, computeWeeks, generateId } from "@/lib/sales-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Radio,
  Clock,
  DollarSign,
  Check,
  Plus,
  Trash2,
  Gift,
  Trophy,
  Copy,
} from "lucide-react";

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
// Campaign name input (shared across all types)
// ---------------------------------------------------------------------------
function CampaignNameInput() {
  const { register } = useFormContext<CampaignFormValues>();

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-[#74ddc7]" />
          Campaign Details
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared flight header (name, dates, weeks) — for non-variation types
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
// FLIGHT VARIATION TILE — combines flight dates + day type + order config
// ===========================================================================

function FlightVariationTile({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { watch, setValue, register } = useFormContext<CampaignFormValues>();
  const campaignType = watch("campaignType");
  const variation = watch(`flightVariations.${index}`);

  if (!variation) return null;

  const weeks = computeWeeks(variation.flightStart, variation.flightEnd);
  const dayType = variation.dayType as DayType;

  // -------------------------------------------------------------------------
  // Get available dayparts for the selected day type
  // -------------------------------------------------------------------------
  function getDaypartsForDayType(dt: DayType): RateCardDaypart[] {
    switch (dt) {
      case "weekday":
        return WEEKDAY_DAYPARTS;
      case "saturday":
        return SATURDAY_DAYPARTS;
      case "sunday":
        return SUNDAY_DAYPARTS;
      case "sports":
        // Sports don't have traditional dayparts
        return [];
    }
  }

  // -------------------------------------------------------------------------
  // Change day type — rebuild daypart orders for this variation
  // -------------------------------------------------------------------------
  function handleDayTypeChange(newDayType: DayType) {
    setValue(`flightVariations.${index}.dayType`, newDayType);

    if (campaignType === "on_air" && newDayType !== "sports") {
      const dayparts = getDaypartsForDayType(newDayType);
      const dayCategory = newDayType as DayCategory;
      const newOrders: DaypartOrderValues[] = dayparts.map((dp) => ({
        daypartId: dp.id,
        dayCategory,
        showName: dp.showName,
        rate: dp.ratePerSpot,
        spotLength: 60 as const,
        orderType: "non_specific" as const,
        spotsPerWeek: 0,
        breakSlots: buildBreakSlots(dp),
      }));
      setValue(`flightVariations.${index}.daypartOrders`, newOrders);
    } else if (newDayType === "sports") {
      setValue(`flightVariations.${index}.daypartOrders`, []);
    }
  }

  // -------------------------------------------------------------------------
  // Per-field helpers for daypart orders within this variation
  // -------------------------------------------------------------------------
  function setOrderFieldValue(
    orderIdx: number,
    key: keyof DaypartOrderValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
  ) {
    setValue(
      `flightVariations.${index}.daypartOrders.${orderIdx}.${key}` as `flightVariations.${number}.daypartOrders.${number}.rate`,
      value,
    );
  }

  function toggleBreak(
    orderIdx: number,
    slotIndex: number,
    breakKey: "break18" | "break48",
  ) {
    const order = watch(
      `flightVariations.${index}.daypartOrders.${orderIdx}`,
    );
    const slots = [...order.breakSlots];
    slots[slotIndex] = {
      ...slots[slotIndex],
      [breakKey]: !slots[slotIndex][breakKey],
    };
    setValue(
      `flightVariations.${index}.daypartOrders.${orderIdx}.breakSlots`,
      slots,
    );
    const total = countBreaks(slots);
    setValue(
      `flightVariations.${index}.daypartOrders.${orderIdx}.spotsPerWeek`,
      total,
    );
  }

  // -------------------------------------------------------------------------
  // Compute weekly total for this variation
  // -------------------------------------------------------------------------
  const variationOrders = variation.daypartOrders ?? [];
  const weeklyTotal = variationOrders.reduce(
    (sum: number, o: DaypartOrderValues) => sum + o.rate * o.spotsPerWeek,
    0,
  );
  const flightTotal = weeklyTotal * Math.max(weeks, 1);

  // Promotions specific
  const promotionDayparts = getDaypartsForDayType(dayType);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-[#74ddc7]" />
            {variation.label || `Flight ${index + 1}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            {weeks > 0 && (
              <Badge variant="secondary" className="text-xs">
                {weeks} {weeks === 1 ? "week" : "weeks"}
              </Badge>
            )}
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Flight label */}
        <div>
          <Label className="text-sm font-medium text-foreground">
            Flight Label
          </Label>
          <Input
            value={variation.label}
            onChange={(e) =>
              setValue(`flightVariations.${index}.label`, e.target.value)
            }
            placeholder={`Flight ${index + 1}`}
            className="mt-1"
          />
        </div>

        {/* Flight dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Flight Start
            </Label>
            <Input
              type="date"
              value={variation.flightStart}
              onChange={(e) =>
                setValue(
                  `flightVariations.${index}.flightStart`,
                  e.target.value,
                )
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">
              Flight End
            </Label>
            <Input
              type="date"
              value={variation.flightEnd}
              onChange={(e) =>
                setValue(
                  `flightVariations.${index}.flightEnd`,
                  e.target.value,
                )
              }
              className="mt-1"
            />
          </div>
        </div>

        <Separator />

        {/* Day Type selection */}
        <div>
          <Label className="text-sm font-medium text-foreground">
            Day Type
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select the day type for this flight. This determines available
            dayparts and time slots.
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DAY_TYPE_LABELS) as DayType[]).map((dt) => {
              // For non-on_air types, hide sports option (it has its own panel)
              if (
                dt === "sports" &&
                campaignType !== "on_air" &&
                campaignType !== "promotions"
              )
                return null;
              return (
                <ToggleButton
                  key={dt}
                  active={dayType === dt}
                  onClick={() => handleDayTypeChange(dt)}
                >
                  {DAY_TYPE_LABELS[dt]}
                </ToggleButton>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* On-Air: Daypart orders */}
        {campaignType === "on_air" && dayType !== "sports" && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              {DAY_TYPE_LABELS[dayType]} Dayparts
            </h4>
            {variationOrders.map((order: DaypartOrderValues, orderIdx: number) => {
              const dp = getDaypartsForDayType(dayType).find(
                (d) => d.id === order.daypartId,
              );
              if (!dp) return null;

              return (
                <div
                  key={order.daypartId}
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
                          setOrderFieldValue(
                            orderIdx,
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
                              setOrderFieldValue(orderIdx, "spotLength", len)
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
                            setOrderFieldValue(
                              orderIdx,
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
                            setOrderFieldValue(
                              orderIdx,
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
                            setOrderFieldValue(
                              orderIdx,
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
                                  toggleBreak(orderIdx, slotIdx, "break18")
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
                                  toggleBreak(orderIdx, slotIdx, "break48")
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
          </div>
        )}

        {/* On-Air + Sports day type */}
        {campaignType === "on_air" && dayType === "sports" && (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">
              Sports dayparts are configured through the Sports Sponsorship
              campaign type. Switch to a weekday/weekend day type for
              traditional daypart scheduling.
            </p>
          </div>
        )}

        {/* Promotions: daypart + time selection */}
        {campaignType === "promotions" && dayType !== "sports" && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Promotion Daypart & Time
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Daypart
                </Label>
                <select
                  value={variation.promotionDaypartId}
                  onChange={(e) =>
                    setValue(
                      `flightVariations.${index}.promotionDaypartId`,
                      e.target.value,
                    )
                  }
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  <option value="">Select daypart...</option>
                  {promotionDayparts.map((dp) => (
                    <option key={dp.id} value={dp.id}>
                      {dp.label} ({formatHourRange(dp.startHour, dp.endHour)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Time Slot
                </Label>
                <select
                  value={variation.promotionTimeSlot}
                  onChange={(e) =>
                    setValue(
                      `flightVariations.${index}.promotionTimeSlot`,
                      e.target.value,
                    )
                  }
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  <option value="">Select time slot...</option>
                  {promotionDayparts
                    .find((dp) => dp.id === variation.promotionDaypartId)
                    ? (() => {
                        const dp = promotionDayparts.find(
                          (d) => d.id === variation.promotionDaypartId,
                        )!;
                        const slots: { value: string; label: string }[] = [];
                        for (let h = dp.startHour; h < dp.endHour; h++) {
                          slots.push({
                            value: `${h}:18`,
                            label: `${formatHourLabel(h)} - :18 break`,
                          });
                          slots.push({
                            value: `${h}:48`,
                            label: `${formatHourLabel(h)} - :48 break`,
                          });
                        }
                        return slots.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ));
                      })()
                    : null}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Promotions: Sports daytype */}
        {campaignType === "promotions" && dayType === "sports" && (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-[#74ddc7]" />
              <h4 className="text-sm font-semibold text-foreground">
                Sports Promotion
              </h4>
            </div>
            <p className="text-sm text-muted-foreground">
              This promotion will be tied to game-day scheduling. Promotions
              will air during pre-game, halftime, and post-game segments.
            </p>
          </div>
        )}

        {/* Flight subtotal */}
        {campaignType === "on_air" && weeklyTotal > 0 && (
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly subtotal</span>
              <span className="font-medium text-foreground">
                {formatCurrency(weeklyTotal)}
              </span>
            </div>
            {weeks > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Flight total ({weeks} {weeks === 1 ? "wk" : "wks"})
                </span>
                <span className="font-bold text-[#74ddc7]">
                  {formatCurrency(flightTotal)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// ON-AIR schedule panel — uses flight variations
// ===========================================================================

function OnAirPanel() {
  const { watch, setValue, control } = useFormContext<CampaignFormValues>();
  const flightVariations = watch("flightVariations");
  const includeMixShows = watch("includeMixShows");
  const mixShowSelections = watch("mixShowSelections");
  const flightStart = watch("flightStart");
  const flightEnd = watch("flightEnd");

  // -----------------------------------------------------------------------
  // Initialize first flight variation if empty
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (flightVariations.length === 0) {
      const defaultOrders: DaypartOrderValues[] = WEEKDAY_DAYPARTS.map(
        (dp) => ({
          daypartId: dp.id,
          dayCategory: "weekday" as const,
          showName: dp.showName,
          rate: dp.ratePerSpot,
          spotLength: 60 as const,
          orderType: "non_specific" as const,
          spotsPerWeek: 0,
          breakSlots: buildBreakSlots(dp),
        }),
      );

      setValue("flightVariations", [
        {
          id: generateId(),
          label: "Flight 1",
          dayType: "weekday",
          flightStart: flightStart,
          flightEnd: flightEnd,
          daypartOrders: defaultOrders,
          promotionDaypartId: "",
          promotionTimeSlot: "",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Add variation handler
  // -----------------------------------------------------------------------
  function addFlightVariation() {
    const currentVariations = watch("flightVariations");
    const newIdx = currentVariations.length + 1;
    const newOrders: DaypartOrderValues[] = WEEKDAY_DAYPARTS.map((dp) => ({
      daypartId: dp.id,
      dayCategory: "weekday" as const,
      showName: dp.showName,
      rate: dp.ratePerSpot,
      spotLength: 60 as const,
      orderType: "non_specific" as const,
      spotsPerWeek: 0,
      breakSlots: buildBreakSlots(dp),
    }));

    setValue("flightVariations", [
      ...currentVariations,
      {
        id: generateId(),
        label: `Flight ${newIdx}`,
        dayType: "weekday",
        flightStart: flightStart,
        flightEnd: flightEnd,
        daypartOrders: newOrders,
        promotionDaypartId: "",
        promotionTimeSlot: "",
      },
    ]);
  }

  // -----------------------------------------------------------------------
  // Remove variation handler
  // -----------------------------------------------------------------------
  function removeFlightVariation(idx: number) {
    const currentVariations = watch("flightVariations");
    const updated = currentVariations.filter((_: FlightVariationValues, i: number) => i !== idx);
    setValue("flightVariations", updated);
  }

  // -----------------------------------------------------------------------
  // Get all selected day categories from flight variations
  // -----------------------------------------------------------------------
  const selectedDayCategories: DayCategory[] = flightVariations
    .map((v: FlightVariationValues) => v.dayType)
    .filter((dt: string) => dt !== "sports") as DayCategory[];

  // -----------------------------------------------------------------------
  // Running totals
  // -----------------------------------------------------------------------
  const allWeeklyTotals = flightVariations.map((v: FlightVariationValues) => {
    const orders = v.daypartOrders ?? [];
    const weeklySum = orders.reduce(
      (sum: number, o: DaypartOrderValues) => sum + o.rate * o.spotsPerWeek,
      0,
    );
    const weeks = computeWeeks(v.flightStart, v.flightEnd);
    return { weekly: weeklySum, total: weeklySum * Math.max(weeks, 1) };
  });

  const totalAllFlights = allWeeklyTotals.reduce(
    (sum: number, t: { weekly: number; total: number }) => sum + t.total,
    0,
  );

  const mixShowTotal = includeMixShows
    ? MIX_SHOW_RATES.filter(
        (m) =>
          selectedDayCategories.includes(m.dayCategory) &&
          mixShowSelections.includes(m.id),
      ).reduce((sum, m) => sum + m.ratePerSegment, 0)
    : 0;

  const grandTotal = totalAllFlights + mixShowTotal;

  return (
    <div className="space-y-6">
      {/* Flight variation tiles */}
      {flightVariations.map((_: FlightVariationValues, idx: number) => (
        <FlightVariationTile
          key={flightVariations[idx]?.id ?? idx}
          index={idx}
          onRemove={() => removeFlightVariation(idx)}
          canRemove={flightVariations.length > 1}
        />
      ))}

      {/* Add Another Flight button */}
      <Button
        type="button"
        variant="outline"
        onClick={addFlightVariation}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Another Flight
      </Button>

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
                selectedDayCategories.includes(m.dayCategory),
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
            {allWeeklyTotals.map(
              (t: { weekly: number; total: number }, idx: number) => {
                if (t.total <= 0) return null;
                const v = flightVariations[idx];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {v?.label || `Flight ${idx + 1}`}
                    </span>
                    <span className="text-foreground">
                      {formatCurrency(t.total)}
                    </span>
                  </div>
                );
              },
            )}
            {includeMixShows && mixShowTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mix shows
                </span>
                <span className="text-foreground">
                  {formatCurrency(mixShowTotal)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Campaign Total
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
// PROMOTIONS panel — with $150/week giveaway tier, daypart + time selection
// ===========================================================================

function PromotionsPanel() {
  const { watch, setValue, register } = useFormContext<CampaignFormValues>();
  const promotionType = watch("promotionType");
  const promotionRate = watch("promotionRate");
  const flightStart = watch("flightStart");
  const flightEnd = watch("flightEnd");
  const flightVariations = watch("flightVariations");
  const weeks = computeWeeks(flightStart, flightEnd);

  // -----------------------------------------------------------------------
  // Initialize first flight variation for promotions if empty
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (flightVariations.length === 0) {
      setValue("flightVariations", [
        {
          id: generateId(),
          label: "Promotion Flight 1",
          dayType: "weekday",
          flightStart: flightStart,
          flightEnd: flightEnd,
          daypartOrders: [],
          promotionDaypartId: "",
          promotionTimeSlot: "",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Add / remove flight variations
  // -----------------------------------------------------------------------
  function addFlightVariation() {
    const currentVariations = watch("flightVariations");
    const newIdx = currentVariations.length + 1;
    setValue("flightVariations", [
      ...currentVariations,
      {
        id: generateId(),
        label: `Promotion Flight ${newIdx}`,
        dayType: "weekday",
        flightStart: flightStart,
        flightEnd: flightEnd,
        daypartOrders: [],
        promotionDaypartId: "",
        promotionTimeSlot: "",
      },
    ]);
  }

  function removeFlightVariation(idx: number) {
    const currentVariations = watch("flightVariations");
    const updated = currentVariations.filter((_: FlightVariationValues, i: number) => i !== idx);
    setValue("flightVariations", updated);
  }

  // Select package from predefined list
  const selectedPackage = PROMOTIONS_PACKAGES.find(
    (p) => p.name === promotionType,
  );

  // Compute total
  const ratePerWeek = selectedPackage?.ratePerWeek ?? promotionRate;
  const totalCost = ratePerWeek * Math.max(weeks, 1);

  return (
    <div className="space-y-6">
      {/* Promotion package selection */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-[#74ddc7]" />
            Select Promotion Package
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROMOTIONS_PACKAGES.map((pkg) => {
              const isSelected = promotionType === pkg.name;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    setValue("promotionType", pkg.name);
                    setValue("promotionRate", pkg.ratePerWeek);
                  }}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    isSelected
                      ? "border-[#74ddc7] bg-[#74ddc7]/5"
                      : "border-border bg-card hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {pkg.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        isSelected
                          ? "border-[#74ddc7]/50 text-[#74ddc7]"
                          : ""
                      }`}
                    >
                      {formatCurrency(pkg.ratePerWeek)}/wk
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pkg.description}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {pkg.includes.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check
                          className={`h-3 w-3 shrink-0 ${
                            isSelected
                              ? "text-[#74ddc7]"
                              : "text-muted-foreground/50"
                          }`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {isSelected && (
                    <div className="mt-2 flex justify-end">
                      <Check className="h-5 w-5 text-[#74ddc7]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom rate override */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rate Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-foreground">
                Rate per Week ($)
              </Label>
              <Input
                type="number"
                min={0}
                value={promotionRate}
                onChange={(e) =>
                  setValue("promotionRate", Number(e.target.value) || 0)
                }
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Override the package rate if needed.
              </p>
            </div>
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

      {/* Flight variation tiles for promotions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Promotion Flights
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure when and where each promotion airs. Add multiple flights
            for different day types or time periods.
          </p>
        </div>

        {flightVariations.map((_: FlightVariationValues, idx: number) => (
          <FlightVariationTile
            key={flightVariations[idx]?.id ?? idx}
            index={idx}
            onRemove={() => removeFlightVariation(idx)}
            canRemove={flightVariations.length > 1}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addFlightVariation}
          className="w-full border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Flight
        </Button>
      </div>

      {/* Pricing summary */}
      <Card className="border-[#74ddc7]/30 bg-card">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedPackage?.name ?? "Promotion"} rate
              </span>
              <span className="text-foreground">
                {formatCurrency(ratePerWeek)}/week
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="text-foreground">
                {weeks > 0 ? `${weeks} week${weeks !== 1 ? "s" : ""}` : "---"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total
              </span>
              <span className="text-lg font-bold text-[#74ddc7]">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>
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
      {/* For on_air and promotions, the flight header is within the variations.
          For other types, show the standard flight header. */}
      {campaignType !== "on_air" && campaignType !== "promotions" && (
        <FlightHeader />
      )}

      {(campaignType === "on_air" || campaignType === "promotions") && (
        <CampaignNameInput />
      )}

      {/* Global flight dates for on_air/promotions — used as defaults */}
      {(campaignType === "on_air" || campaignType === "promotions") && (
        <GlobalFlightDates />
      )}

      {campaignType === "on_air" && <OnAirPanel />}
      {campaignType === "remote_broadcast" && <RemoteBroadcastPanel />}
      {campaignType === "sports_sponsorship" && <SportsSponsorshipPanel />}
      {campaignType === "digital" && <DigitalPanel />}
      {campaignType === "promotions" && <PromotionsPanel />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Global Flight Dates — shown for on_air and promotions as the default dates
// for new flight variations
// ---------------------------------------------------------------------------

function GlobalFlightDates() {
  const { register, watch } = useFormContext<CampaignFormValues>();
  const flightStart = watch("flightStart");
  const flightEnd = watch("flightEnd");
  const weeks = computeWeeks(flightStart, flightEnd);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-[#74ddc7]" />
          Default Flight Dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Set the default date range. Individual flight tiles can override
          these dates.
        </p>
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
