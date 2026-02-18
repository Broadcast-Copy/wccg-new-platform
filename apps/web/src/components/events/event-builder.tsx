"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { TicketSelector } from "./ticket-selector";

type BuilderStep = "details" | "tickets" | "review";

export function EventBuilder() {
  const [step, setStep] = useState<BuilderStep>("details");

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className={step === "details" ? "font-medium text-foreground" : ""}
        >
          1. Details
        </span>
        <span>&rarr;</span>
        <span
          className={step === "tickets" ? "font-medium text-foreground" : ""}
        >
          2. Tickets
        </span>
        <span>&rarr;</span>
        <span
          className={step === "review" ? "font-medium text-foreground" : ""}
        >
          3. Review
        </span>
      </div>

      <Separator />

      {step === "details" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input id="title" placeholder="Enter event title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your event"
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" placeholder="Event venue or location" />
          </div>
          <Button onClick={() => setStep("tickets")}>Next: Tickets</Button>
        </div>
      )}

      {step === "tickets" && (
        <div className="space-y-4">
          <TicketSelector />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("details")}>
              Back
            </Button>
            <Button onClick={() => setStep("review")}>Next: Review</Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground">
              Review your event details before publishing. (Event summary will
              be rendered here.)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("tickets")}>
              Back
            </Button>
            <Button>
              {/* TODO: Submit event to API */}
              Publish Event
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
