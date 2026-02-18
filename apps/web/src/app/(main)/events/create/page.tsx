"use client";

import { EventBuilder } from "@/components/events/event-builder";

export default function CreateEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
        <p className="text-muted-foreground">
          Set up a new event for the WCCG community
        </p>
      </div>
      <EventBuilder />
    </div>
  );
}
