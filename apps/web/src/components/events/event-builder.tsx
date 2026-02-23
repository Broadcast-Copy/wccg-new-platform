"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Eye,
  Send,
  Image as ImageIcon,
} from "lucide-react";

import { TicketSelector } from "./ticket-selector";
import { apiClient } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
] as const;

const VISIBILITY_OPTIONS = ["PUBLIC", "PRIVATE", "INVITE_ONLY"] as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const ticketTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Ticket name is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  description: z.string(),
});

const eventSchema = z.object({
  // Step 1: Basic Info
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string(),

  // Step 2: Date, Time & Venue
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string(),
  endTime: z.string(),
  timezone: z.string().min(1, "Timezone is required"),
  venue: z.string().min(1, "Venue name is required"),
  address: z.string(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string(),

  // Step 3: Tickets
  isFree: z.boolean(),
  ticketTypes: z.array(ticketTypeSchema).min(1, "At least one ticket type is required"),
  maxAttendees: z.number().int().min(1).optional(),
  visibility: z.enum(VISIBILITY_OPTIONS),

  // Step 4: Media
  imageUrl: z.string(),
  bannerUrl: z.string(),
});

type EventFormValues = z.infer<typeof eventSchema>;

// Per-step field keys for partial validation
const STEP_FIELDS: Record<number, (keyof EventFormValues)[]> = {
  0: ["title", "slug", "description"],
  1: ["startDate", "startTime", "timezone", "venue", "city", "state"],
  2: ["ticketTypes", "visibility"],
  3: [], // media is optional
  4: [], // review
};

const STEP_LABELS = [
  "Basic Info",
  "Date & Venue",
  "Tickets",
  "Media",
  "Review",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventBuilder() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      timezone: "America/New_York",
      venue: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      isFree: true,
      ticketTypes: [
        {
          id: "1",
          name: "General Admission",
          price: 0,
          quantity: 100,
          description: "",
        },
      ],
      maxAttendees: undefined,
      visibility: "PUBLIC",
      imageUrl: "",
      bannerUrl: "",
    },
    mode: "onTouched",
  });

  // Watch title to auto-generate slug
  const titleValue = watch("title");
  const isFreeValue = watch("isFree");
  const imageUrlValue = watch("imageUrl");
  const bannerUrlValue = watch("bannerUrl");

  useEffect(() => {
    if (!slugManuallyEdited && titleValue) {
      setValue("slug", generateSlug(titleValue));
    }
  }, [titleValue, slugManuallyEdited, setValue]);

  // When toggling to free, force all ticket prices to 0
  useEffect(() => {
    if (isFreeValue) {
      const current = getValues("ticketTypes");
      const updated = current.map((t) => ({ ...t, price: 0 }));
      setValue("ticketTypes", updated);
    }
  }, [isFreeValue, getValues, setValue]);

  // ---------------------------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------------------------

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const fields = STEP_FIELDS[currentStep];
    if (!fields || fields.length === 0) return true;
    const result = await trigger(fields);
    return result;
  }, [currentStep, trigger]);

  const goNext = async () => {
    const valid = await validateCurrentStep();
    if (valid) {
      setCurrentStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
    }
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const submitEvent = async (status: "DRAFT" | "PUBLISHED") => {
    // Validate all steps before final submission
    const valid = await trigger();
    if (!valid) {
      toast.error("Please fix the validation errors before submitting.");
      // Jump to first step with errors
      for (let i = 0; i < STEP_LABELS.length - 1; i++) {
        const fields = STEP_FIELDS[i];
        if (fields?.some((f) => errors[f])) {
          setCurrentStep(i);
          return;
        }
      }
      return;
    }

    const data = getValues();

    // Build ISO date strings
    const startDateISO = new Date(
      `${data.startDate}T${data.startTime}`,
    ).toISOString();

    let endDateISO: string | undefined;
    if (data.endDate && data.endTime) {
      endDateISO = new Date(
        `${data.endDate}T${data.endTime}`,
      ).toISOString();
    }

    // Build ticket types for API (strip client-side `id`)
    const ticketTypesPayload = data.ticketTypes.map((t) => ({
      name: t.name,
      price: data.isFree ? 0 : t.price,
      quantity: t.quantity,
      description: t.description || undefined,
    }));

    const body = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      image_url: data.imageUrl || undefined,
      banner_url: data.bannerUrl || undefined,
      venue: data.venue,
      address: data.address || undefined,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode || undefined,
      start_date: startDateISO,
      end_date: endDateISO,
      timezone: data.timezone,
      category: data.category || undefined,
      status,
      visibility: data.visibility,
      max_attendees: data.maxAttendees || undefined,
      is_free: data.isFree,
      ticket_types: ticketTypesPayload,
    };

    setIsSubmitting(true);
    try {
      const result = await apiClient<{ id: string }>("/events", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(
        status === "PUBLISHED"
          ? "Event published successfully!"
          : "Event saved as draft.",
      );
      router.push(`/events/${result.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create event";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Inline error helper
  // ---------------------------------------------------------------------------

  function FieldError({ name }: { name: keyof EventFormValues }) {
    const error = errors[name];
    if (!error) return null;
    return (
      <p className="text-sm text-destructive">{error.message as string}</p>
    );
  }

  // ---------------------------------------------------------------------------
  // Render helpers for each step
  // ---------------------------------------------------------------------------

  function renderStepBasicInfo() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            Event Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Enter event title"
            {...register("title")}
          />
          <FieldError name="title" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slug"
            placeholder="event-slug"
            {...register("slug", {
              onChange: () => setSlugManuallyEdited(true),
            })}
          />
          <p className="text-xs text-muted-foreground">
            URL-friendly identifier. Auto-generated from title unless you edit it.
          </p>
          <FieldError name="slug" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your event"
            rows={4}
            {...register("description")}
          />
          <FieldError name="description" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g. Music, Workshop, Community"
            {...register("category")}
          />
        </div>
      </div>
    );
  }

  function renderStepDateTime() {
    return (
      <div className="space-y-6">
        {/* Date & Time */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Calendar className="h-4 w-4" /> Date & Time
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              <FieldError name="startDate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input id="startTime" type="time" {...register("startTime")} />
              <FieldError name="startTime" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              <FieldError name="endDate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...register("endTime")} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="timezone">
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError name="timezone" />
          </div>
        </div>

        <Separator />

        {/* Venue */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-4 w-4" /> Venue
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue">
                Venue Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="venue"
                placeholder="e.g. WCCG Community Center"
                {...register("venue")}
              />
              <FieldError name="venue" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                {...register("address")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input id="city" placeholder="City" {...register("city")} />
                <FieldError name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="state"
                  placeholder="State"
                  {...register("state")}
                />
                <FieldError name="state" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  placeholder="Zip code"
                  {...register("zipCode")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStepTickets() {
    return (
      <div className="space-y-6">
        {/* Free toggle */}
        <div className="flex items-center gap-4">
          <Label htmlFor="isFree-toggle" className="text-base font-medium">
            Is this a free event?
          </Label>
          <Controller
            control={control}
            name="isFree"
            render={({ field }) => (
              <Button
                id="isFree-toggle"
                type="button"
                variant={field.value ? "default" : "outline"}
                size="sm"
                onClick={() => field.onChange(!field.value)}
              >
                {field.value ? "Yes — Free" : "No — Paid"}
              </Button>
            )}
          />
        </div>

        {/* Ticket types */}
        <Controller
          control={control}
          name="ticketTypes"
          render={({ field }) => (
            <TicketSelector
              tickets={field.value}
              onChange={field.onChange}
              isFree={isFreeValue}
            />
          )}
        />
        {errors.ticketTypes && (
          <p className="text-sm text-destructive">
            {typeof errors.ticketTypes.message === "string"
              ? errors.ticketTypes.message
              : "Please add at least one valid ticket type."}
          </p>
        )}

        <Separator />

        {/* Max attendees */}
        <div className="space-y-2">
          <Label htmlFor="maxAttendees">Max Attendees (optional)</Label>
          <Input
            id="maxAttendees"
            type="number"
            min="1"
            placeholder="Unlimited if left blank"
            {...register("maxAttendees", {
              setValueAs: (v: string) => {
                const n = parseInt(v, 10);
                return isNaN(n) ? undefined : n;
              },
            })}
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label htmlFor="visibility">
            Visibility <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="visibility"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "INVITE_ONLY" ? "Invite Only" : v.charAt(0) + v.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError name="visibility" />
        </div>
      </div>
    );
  }

  function renderStepMedia() {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
          <p className="text-sm">
            Add images for your event listing. Both fields are optional.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Event Image URL</Label>
          <Input
            id="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            {...register("imageUrl")}
          />
        </div>

        {imageUrlValue && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Image Preview
            </p>
            <div className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrlValue}
                alt="Event preview"
                className="h-48 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bannerUrl">Banner Image URL</Label>
          <Input
            id="bannerUrl"
            type="url"
            placeholder="https://example.com/banner.jpg"
            {...register("bannerUrl")}
          />
        </div>

        {bannerUrlValue && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Banner Preview
            </p>
            <div className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrlValue}
                alt="Banner preview"
                className="h-32 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStepReview() {
    const data = getValues();
    const tzLabel =
      TIMEZONES.find((tz) => tz.value === data.timezone)?.label ?? data.timezone;

    const formatDate = (dateStr: string, timeStr: string) => {
      if (!dateStr || !timeStr) return "Not set";
      try {
        const dt = new Date(`${dateStr}T${timeStr}`);
        return dt.toLocaleString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return `${dateStr} ${timeStr}`;
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-5 w-5" />
          <p className="text-sm">
            Review your event details before saving.
          </p>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium">{data.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs">{data.slug}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {data.description}
              </p>
            </div>
            {data.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="secondary">{data.category}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date & Venue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Date & Venue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> Start
              </span>
              <span>{formatDate(data.startDate, data.startTime)}</span>
            </div>
            {data.endDate && data.endTime && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> End
                </span>
                <span>{formatDate(data.endDate, data.endTime)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timezone</span>
              <span>{tzLabel}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" /> Venue
              </span>
              <span>{data.venue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span>
                {[data.address, data.city, data.state, data.zipCode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tickets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free event</span>
              <Badge variant={data.isFree ? "default" : "outline"}>
                {data.isFree ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visibility</span>
              <Badge variant="secondary">{data.visibility}</Badge>
            </div>
            {data.maxAttendees && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max attendees</span>
                <span>{data.maxAttendees}</span>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              {data.ticketTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{t.name || "Unnamed"}</span>
                    {t.description && (
                      <p className="text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      {data.isFree || t.price === 0
                        ? "Free"
                        : `$${t.price.toFixed(2)}`}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t.quantity} available
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        {(data.imageUrl || data.bannerUrl) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.imageUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Image</span>
                  <span className="max-w-[200px] truncate text-xs">
                    {data.imageUrl}
                  </span>
                </div>
              )}
              {data.bannerUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Banner</span>
                  <span className="max-w-[200px] truncate text-xs">
                    {data.bannerUrl}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step content dispatcher
  // ---------------------------------------------------------------------------

  const STEP_RENDERERS = [
    renderStepBasicInfo,
    renderStepDateTime,
    renderStepTickets,
    renderStepMedia,
    renderStepReview,
  ];

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit(() => submitEvent("PUBLISHED"))}
      className="space-y-6"
    >
      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            {i > 0 && (
              <span className="mx-1 text-muted-foreground">&rarr;</span>
            )}
            <button
              type="button"
              onClick={() => {
                // Allow clicking completed steps directly
                if (i < currentStep) setCurrentStep(i);
              }}
              className={
                i === currentStep
                  ? "font-semibold text-foreground"
                  : i < currentStep
                    ? "cursor-pointer text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    : "cursor-default text-muted-foreground"
              }
            >
              {i + 1}. {label}
            </button>
          </div>
        ))}
      </div>

      <Separator />

      {/* Step content */}
      {STEP_RENDERERS[currentStep]()}

      <Separator />

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep < STEP_LABELS.length - 1 && (
            <Button type="button" onClick={goNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {currentStep === STEP_LABELS.length - 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => submitEvent("DRAFT")}
              >
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Publishing..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publish Event
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
