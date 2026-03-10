"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { CampaignFormValues } from "./campaign-builder-types";
import {
  ALL_DAYPARTS,
  REMOTE_PACKAGES,
  DUKE_SPORTS,
  CAMPAIGN_TYPES,
  formatHourRange,
} from "@/data/rate-card";
import {
  formatCurrency,
  formatDate,
  computeWeeks,
  computeFlightWeeks,
  generateInvoiceNumber,
  generateId,
  type TrafficOrder,
  type TrafficOrderLine,
  type InvoiceLineItem,
  type MarketingCampaign,
  type SalesClient,
  MARKETING_CAMPAIGNS_KEY,
  INVOICES_KEY,
  CLIENTS_KEY,
  loadOrSeed,
  persist,
} from "@/lib/sales-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  FileText,
  Download,
  Save,
  Radio,
  Calendar,
  DollarSign,
  User,
  Building2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLineItems(values: CampaignFormValues, weeks: number): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];

  if (values.campaignType === "on_air") {
    for (const order of values.daypartOrders) {
      if (order.spotsPerWeek <= 0) continue;
      const dp = ALL_DAYPARTS.find((d) => d.id === order.daypartId);
      const label = dp?.label ?? order.daypartId;
      const slotsPerDay = order.breakSlots
        ? order.breakSlots.filter((s) => s.break18 || s.break48).length
        : 0;
      items.push({
        daypartLabel: label,
        orderType: order.orderType,
        slotsPerDay,
        spotsPerWeek: order.spotsPerWeek,
        weeks,
        ratePerSpot: order.rate,
        lineTotal: order.rate * order.spotsPerWeek * weeks,
      });
    }
  } else if (values.campaignType === "remote_broadcast") {
    const pkg = REMOTE_PACKAGES.find((p) => p.id === values.remotePackageId);
    if (pkg) {
      let total = pkg.baseRate;
      if (values.remoteIncludePersonality) total += pkg.personalityFee;
      if (values.remoteIncludeDj) total += pkg.optionalDjFee;
      items.push({
        daypartLabel: pkg.name,
        orderType: "remote",
        slotsPerDay: 0,
        spotsPerWeek: pkg.spots,
        weeks: 1,
        ratePerSpot: total,
        lineTotal: total,
      });
    }
  } else if (values.campaignType === "sports_sponsorship") {
    for (const pkgId of values.sportsPackages) {
      for (const sport of DUKE_SPORTS) {
        const found = sport.packages.find((p) => p.id === pkgId);
        if (found) {
          items.push({
            daypartLabel: `${sport.label} - ${found.name}`,
            orderType: "sports",
            slotsPerDay: 0,
            spotsPerWeek: 0,
            weeks: 1,
            ratePerSpot: found.rate,
            lineTotal: found.rate,
          });
        }
      }
    }
  }

  return items;
}

function buildTrafficOrder(
  values: CampaignFormValues,
  weeks: number,
  lineItems: InvoiceLineItem[],
): TrafficOrder | null {
  if (values.campaignType !== "on_air") return null;

  const lines: TrafficOrderLine[] = values.daypartOrders
    .filter((o) => o.spotsPerWeek > 0)
    .map((o) => {
      const dp = ALL_DAYPARTS.find((d) => d.id === o.daypartId);
      const breakPosition: ":18" | ":48" | "ROS" =
        o.orderType === "non_specific"
          ? "ROS"
          : o.breakSlots.some((s) => s.break18) && o.breakSlots.some((s) => s.break48)
            ? ":18"
            : o.breakSlots.some((s) => s.break48)
              ? ":48"
              : ":18";
      return {
        daypartId: o.daypartId,
        showName: dp?.showName ?? o.showName,
        dayCategory: o.dayCategory,
        timeRange: dp
          ? formatHourRange(dp.startHour, dp.endHour)
          : "",
        spotLength: o.spotLength,
        breakPosition,
        rate: o.rate,
        spotsPerWeek: o.spotsPerWeek,
      };
    });

  const totalSpots = lines.reduce((s, l) => s + l.spotsPerWeek * weeks, 0);
  const totalCost = lineItems.reduce((s, l) => s + l.lineTotal, 0);

  return {
    advertiser: values.clientName,
    agency: "",
    campaignName: values.campaignName,
    flightStart: values.flightStart,
    flightEnd: values.flightEnd,
    totalWeeks: weeks,
    lines,
    totalSpots,
    totalCost,
  };
}

// ---------------------------------------------------------------------------
// StepReview — Review & Invoice generation
// ---------------------------------------------------------------------------

export function StepReview() {
  const { watch, setValue, getValues } = useFormContext<CampaignFormValues>();
  const values = watch();

  const [saved, setSaved] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(false);

  // Compute weeks & line items
  const weeks = useMemo(
    () => computeWeeks(values.flightStart, values.flightEnd),
    [values.flightStart, values.flightEnd],
  );

  const lineItems = useMemo(
    () => buildLineItems(values, weeks),
    [values, weeks],
  );

  const trafficOrder = useMemo(
    () => buildTrafficOrder(values, weeks, lineItems),
    [values, weeks, lineItems],
  );

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.lineTotal, 0),
    [lineItems],
  );

  const taxAmount = useMemo(
    () => subtotal * (values.taxRate / 100),
    [subtotal, values.taxRate],
  );

  const grandTotal = subtotal + taxAmount;

  const campaignTypeLabel =
    CAMPAIGN_TYPES.find((ct) => ct.value === values.campaignType)?.label ??
    values.campaignType;

  // Remote broadcast details
  const remotePkg = useMemo(
    () =>
      values.campaignType === "remote_broadcast"
        ? REMOTE_PACKAGES.find((p) => p.id === values.remotePackageId)
        : null,
    [values.campaignType, values.remotePackageId],
  );

  // Sports packages details
  const selectedSportsPackages = useMemo(() => {
    if (values.campaignType !== "sports_sponsorship") return [];
    const result: { sport: string; name: string; rate: number }[] = [];
    for (const pkgId of values.sportsPackages) {
      for (const sport of DUKE_SPORTS) {
        const found = sport.packages.find((p) => p.id === pkgId);
        if (found) {
          result.push({
            sport: sport.label,
            name: found.name,
            rate: found.rate,
          });
        }
      }
    }
    return result;
  }, [values.campaignType, values.sportsPackages]);

  // -------------------------------------------------------------------------
  // Save / generate actions
  // -------------------------------------------------------------------------

  const buildClient = (): SalesClient => ({
    id: values.clientId || generateId(),
    businessName: values.clientName,
    contactName: "",
    email: "",
    phone: "",
    address: "",
    category: "",
  });

  const handleSaveDraft = () => {
    const client = buildClient();

    const campaign: MarketingCampaign = {
      id: generateId(),
      campaignType: values.campaignType,
      campaignName: values.campaignName,
      client,
      flightStart: values.flightStart,
      flightEnd: values.flightEnd,
      trafficOrder,
      lineItems,
      subtotal,
      taxRate: values.taxRate,
      taxAmount,
      total: grandTotal,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    const existing = loadOrSeed<MarketingCampaign>(
      MARKETING_CAMPAIGNS_KEY,
      [],
    );
    existing.push(campaign);
    persist(MARKETING_CAMPAIGNS_KEY, existing);

    setSaved(true);
    toast.success("Campaign saved as draft.");
  };

  const handleGenerateInvoice = () => {
    const client = buildClient();

    const campaign: MarketingCampaign = {
      id: generateId(),
      campaignType: values.campaignType,
      campaignName: values.campaignName,
      client,
      flightStart: values.flightStart,
      flightEnd: values.flightEnd,
      trafficOrder,
      lineItems,
      subtotal,
      taxRate: values.taxRate,
      taxAmount,
      total: grandTotal,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const campaigns = loadOrSeed<MarketingCampaign>(
      MARKETING_CAMPAIGNS_KEY,
      [],
    );
    campaigns.push(campaign);
    persist(MARKETING_CAMPAIGNS_KEY, campaigns);

    // Create invoice
    const invoice = {
      id: generateId(),
      invoiceNumber: generateInvoiceNumber(),
      campaignName: values.campaignName,
      client,
      flightStart: values.flightStart,
      flightEnd: values.flightEnd,
      lineItems,
      subtotal,
      taxRate: values.taxRate,
      taxAmount,
      total: grandTotal,
      status: "Draft" as const,
      createdAt: new Date().toISOString(),
    };

    const invoices = loadOrSeed<typeof invoice>(INVOICES_KEY, []);
    invoices.push(invoice);
    persist(INVOICES_KEY, invoices);

    setGeneratedInvoice(true);
    toast.success(
      `Invoice ${invoice.invoiceNumber} generated for ${formatCurrency(grandTotal)}.`,
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Review & Invoice
        </h3>
        <p className="text-sm text-muted-foreground">
          Review the campaign details and generate an invoice.
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Campaign Summary */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-[#74ddc7]" />
            Campaign Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Campaign Type</span>
            <Badge variant="secondary">{campaignTypeLabel}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Building2 className="h-3 w-3" /> Client
            </span>
            <span className="font-medium">{values.clientName || "---"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Campaign Name</span>
            <span className="font-medium">
              {values.campaignName || "---"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" /> Flight Dates
            </span>
            <span>
              {values.flightStart
                ? formatDate(values.flightStart)
                : "---"}{" "}
              &mdash;{" "}
              {values.flightEnd ? formatDate(values.flightEnd) : "---"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Total Weeks
            </span>
            <span className="font-medium">{weeks}</span>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Traffic Order Preview (on_air only) */}
      {/* ----------------------------------------------------------------- */}
      {values.campaignType === "on_air" && trafficOrder && trafficOrder.lines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[#74ddc7]" />
              Marketron Traffic Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Show</th>
                    <th className="pb-2 pr-4">Day</th>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Length</th>
                    <th className="pb-2 pr-4">Break</th>
                    <th className="pb-2 pr-4 text-right">Rate</th>
                    <th className="pb-2 text-right">Spots/Wk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trafficOrder.lines.map((line, i) => {
                    const order = values.daypartOrders.find(
                      (o) => o.daypartId === line.daypartId,
                    );
                    const breakDisplay =
                      order?.orderType === "non_specific"
                        ? "ROS"
                        : (() => {
                            const checked: string[] = [];
                            if (order?.breakSlots.some((s) => s.break18))
                              checked.push(":18");
                            if (order?.breakSlots.some((s) => s.break48))
                              checked.push(":48");
                            return checked.join(", ") || "---";
                          })();

                    return (
                      <tr key={i}>
                        <td className="py-2 pr-4 font-medium">
                          {line.showName}
                        </td>
                        <td className="py-2 pr-4 capitalize">
                          {line.dayCategory}
                        </td>
                        <td className="py-2 pr-4">{line.timeRange}</td>
                        <td className="py-2 pr-4">{line.spotLength}s</td>
                        <td className="py-2 pr-4">{breakDisplay}</td>
                        <td className="py-2 pr-4 text-right">
                          {formatCurrency(line.rate)}
                        </td>
                        <td className="py-2 text-right">
                          {line.spotsPerWeek}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium">
                    <td colSpan={5} className="pt-2">
                      Total
                    </td>
                    <td className="pt-2 text-right">
                      {formatCurrency(trafficOrder.totalCost)}
                    </td>
                    <td className="pt-2 text-right">
                      {trafficOrder.totalSpots} total
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Remote Broadcast Details */}
      {/* ----------------------------------------------------------------- */}
      {values.campaignType === "remote_broadcast" && remotePkg && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Remote Broadcast Package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium">{remotePkg.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Rate</span>
              <span>{formatCurrency(remotePkg.baseRate)}</span>
            </div>
            {values.remoteIncludePersonality && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personality Fee</span>
                <span>{formatCurrency(remotePkg.personalityFee)}</span>
              </div>
            )}
            {values.remoteIncludeDj && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">DJ Fee</span>
                <span>{formatCurrency(remotePkg.optionalDjFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="text-[#74ddc7]">
                {formatCurrency(
                  remotePkg.baseRate +
                    (values.remoteIncludePersonality
                      ? remotePkg.personalityFee
                      : 0) +
                    (values.remoteIncludeDj ? remotePkg.optionalDjFee : 0),
                )}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Spots included</span>
              <span>{remotePkg.spots}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Callback hours</span>
              <span>{remotePkg.callbackHours}h</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Sports Sponsorship Details */}
      {/* ----------------------------------------------------------------- */}
      {values.campaignType === "sports_sponsorship" &&
        selectedSportsPackages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Sports Sponsorship Packages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {selectedSportsPackages.map((pkg, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {pkg.sport} &mdash; {pkg.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(pkg.rate)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="text-[#74ddc7]">
                  {formatCurrency(
                    selectedSportsPackages.reduce((s, p) => s + p.rate, 0),
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

      {/* ----------------------------------------------------------------- */}
      {/* Invoice Preview */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-[#74ddc7]" />
            Invoice Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2 pr-4">Daypart</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4 text-right">Spots/Wk</th>
                      <th className="pb-2 pr-4 text-right">Weeks</th>
                      <th className="pb-2 pr-4 text-right">Rate</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((li, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-4 font-medium">
                          {li.daypartLabel}
                        </td>
                        <td className="py-2 pr-4 capitalize">
                          {li.orderType}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {li.spotsPerWeek || "---"}
                        </td>
                        <td className="py-2 pr-4 text-right">{li.weeks}</td>
                        <td className="py-2 pr-4 text-right">
                          {formatCurrency(li.ratePerSpot)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(li.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator />

              {/* Subtotal / tax / total */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <Label
                    htmlFor="taxRate"
                    className="text-muted-foreground"
                  >
                    Tax Rate (%)
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="h-8 w-24 text-right"
                    value={values.taxRate}
                    onChange={(e) =>
                      setValue("taxRate", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax Amount</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Grand Total</span>
                  <span className="text-lg font-bold text-[#74ddc7]">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No line items yet. Add daypart orders in the Schedule step to see
              the invoice preview.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Actions */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {saved || generatedInvoice ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            {generatedInvoice
              ? "Campaign saved and invoice generated."
              : "Campaign saved as draft."}
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={handleGenerateInvoice}
              className="bg-[#74ddc7] text-gray-900 hover:bg-[#74ddc7]/90"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
