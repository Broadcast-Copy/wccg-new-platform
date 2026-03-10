"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import type { CampaignFormValues } from "./campaign-builder-types";
import { generateId } from "@/lib/sales-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Music,
  Image as ImageIcon,
  FileVideo,
  Upload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Creative type definitions
// ---------------------------------------------------------------------------

const CREATIVE_TYPES = [
  { value: "audio_15s", label: "15s", icon: "music" },
  { value: "audio_30s", label: "30s", icon: "music" },
  { value: "audio_60s", label: "60s", icon: "music" },
  { value: "banner", label: "Banner", icon: "image" },
  { value: "video", label: "Video", icon: "video" },
] as const;

type CreativeType = (typeof CREATIVE_TYPES)[number]["value"];

const STATUS_CYCLE: ("draft" | "ready" | "approved")[] = [
  "draft",
  "ready",
  "approved",
];

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "default"> = {
  draft: "secondary",
  ready: "outline",
  approved: "default",
};

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

function CreativeTypeIcon({
  type,
  className,
}: {
  type: CreativeType;
  className?: string;
}) {
  if (type === "banner") return <ImageIcon className={className} />;
  if (type === "video") return <FileVideo className={className} />;
  return <Music className={className} />;
}

// ---------------------------------------------------------------------------
// StepCreative — Audio / Creative management (optional step)
// ---------------------------------------------------------------------------

export function StepCreative() {
  const { control, watch, setValue } = useFormContext<CampaignFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "creatives",
  });

  const creatives = watch("creatives");

  const handleAddCreative = () => {
    append({
      id: generateId(),
      name: "",
      type: "audio_30s",
      fileUrl: "",
      status: "draft",
    });
  };

  const cycleStatus = (index: number) => {
    const current = creatives[index]?.status ?? "draft";
    const currentIdx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    setValue(`creatives.${index}.status`, next);
  };

  const setType = (index: number, type: CreativeType) => {
    setValue(`creatives.${index}.type`, type);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Audio / Creative Assets
        </h3>
        <p className="text-sm text-muted-foreground">
          Attach audio files, banners, or video assets to this campaign. This
          step is optional.
        </p>
      </div>

      {/* Empty state */}
      {fields.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No creatives added yet. You can add audio files or other assets
              for this campaign. This step is optional.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Creative cards */}
      <div className="space-y-4">
        {fields.map((field, index) => {
          const creative = creatives[index];
          return (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <CreativeTypeIcon
                      type={creative?.type ?? "audio_30s"}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  </div>
                  <CardTitle className="text-base">
                    Creative #{index + 1}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status badge — click to cycle */}
                  <Badge
                    variant={
                      STATUS_VARIANT[creative?.status ?? "draft"] ?? "secondary"
                    }
                    className={`cursor-pointer select-none transition-colors ${
                      creative?.status === "approved"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : creative?.status === "ready"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : ""
                    }`}
                    onClick={() => cycleStatus(index)}
                  >
                    {creative?.status ?? "draft"}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor={`creative-name-${index}`}>Name</Label>
                  <Input
                    id={`creative-name-${index}`}
                    placeholder="e.g. Summer Sale 30s Spot"
                    {...control.register(`creatives.${index}.name`)}
                  />
                </div>

                {/* Type toggle buttons */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {CREATIVE_TYPES.map((ct) => {
                      const isActive = creative?.type === ct.value;
                      return (
                        <Button
                          key={ct.value}
                          type="button"
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          className={
                            isActive
                              ? "border-[#74ddc7] bg-[#74ddc7]/20 text-[#74ddc7] hover:bg-[#74ddc7]/30"
                              : ""
                          }
                          onClick={() => setType(index, ct.value)}
                        >
                          <CreativeTypeIcon
                            type={ct.value}
                            className="mr-1.5 h-3.5 w-3.5"
                          />
                          {ct.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* File URL */}
                <div className="space-y-2">
                  <Label htmlFor={`creative-file-${index}`}>File URL</Label>
                  <Input
                    id={`creative-file-${index}`}
                    placeholder="https://cdn.example.com/audio/spot.mp3"
                    {...control.register(`creatives.${index}.fileUrl`)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a link to the creative file, or leave blank for now.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddCreative}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Creative
      </Button>
    </div>
  );
}
