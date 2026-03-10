"use client";

import { useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  campaignFormSchema,
  STEP_LABELS,
  DEFAULT_FORM_VALUES,
  type CampaignFormValues,
} from "./campaign-builder-types";
import { StepCampaignType } from "./step-campaign-type";
import { StepClient } from "./step-client";
import { StepSchedule } from "./step-schedule";
import { StepCreative } from "./step-creative";
import { StepReview } from "./step-review";

// ---------------------------------------------------------------------------
// Step subtitles
// ---------------------------------------------------------------------------

const STEP_SUBTITLES = [
  "Select the type of advertising campaign to build.",
  "Choose or create the client for this campaign.",
  "Set flight dates, dayparts, and spot placements.",
  "Attach audio files, banners, or video assets (optional).",
  "Review your campaign and generate an invoice.",
];

// ---------------------------------------------------------------------------
// CampaignBuilder — main orchestrator
// ---------------------------------------------------------------------------

export function CampaignBuilder() {
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onTouched",
  });

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < STEP_LABELS.length) {
      setCurrentStep(step);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Step content
  // -----------------------------------------------------------------------

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepCampaignType />;
      case 1:
        return <StepClient />;
      case 2:
        return <StepSchedule />;
      case 3:
        return <StepCreative />;
      case 4:
        return <StepReview />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEP_LABELS.length - 1;

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Campaign Builder
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {STEP_SUBTITLES[currentStep]}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            const isFuture = i > currentStep;

            return (
              <div key={label} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`mx-1 h-px w-6 sm:w-10 ${
                      isCompleted ? "bg-emerald-500" : "bg-border"
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  {/* Circle / badge */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-[#74ddc7] text-gray-900"
                        : isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {/* Label — hide on small screens for middle steps */}
                  <span
                    className={`hidden text-sm sm:inline ${
                      isCurrent
                        ? "font-semibold text-foreground"
                        : isCompleted
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Step content */}
        <div className="min-h-[400px]">{renderStep()}</div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Bottom navigation */}
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
            {!isLastStep && (
              <Button type="button" onClick={goNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
