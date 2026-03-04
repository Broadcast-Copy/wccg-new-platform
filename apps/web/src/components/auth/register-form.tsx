"use client";

import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { toast } from "sonner";
import {
  UserPlus,
  Headphones,
  Mic,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserType = "listener" | "creator" | "employee";
type CreatorType = "podcaster" | "musician" | "dj";

// ---------------------------------------------------------------------------
// Zod schema — only for the email + password step (step 3)
// ---------------------------------------------------------------------------

const credentialsSchema = z
  .object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => {
        const isCompleted = step < current;
        const isActive = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                isCompleted
                  ? "bg-[#74ddc7] text-black"
                  : isActive
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 3 && (
              <div
                className={`h-0.5 w-8 rounded-full transition-colors ${
                  isCompleted ? "bg-[#74ddc7]" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — User type selection
// ---------------------------------------------------------------------------

const USER_TYPE_OPTIONS: {
  value: UserType;
  label: string;
  subtitle: string;
  Icon: typeof Headphones;
  color: string;
  ring: string;
}[] = [
  {
    value: "listener",
    label: "Listener",
    subtitle: "Listen, earn points, attend events",
    Icon: Headphones,
    color: "text-[#74ddc7]",
    ring: "ring-[#74ddc7]",
  },
  {
    value: "creator",
    label: "Creator",
    subtitle: "Podcast, upload music, create content",
    Icon: Mic,
    color: "text-[#7401df]",
    ring: "ring-[#7401df]",
  },
  {
    value: "employee",
    label: "Employee",
    subtitle: "Staff access with employee code",
    Icon: Building2,
    color: "text-[#dc2626]",
    ring: "ring-[#dc2626]",
  },
];

function StepUserType({
  userType,
  onSelect,
}: {
  userType: UserType | null;
  onSelect: (t: UserType) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Choose the option that best describes you
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {USER_TYPE_OPTIONS.map(({ value, label, subtitle, Icon, color, ring }) => {
          const selected = userType === value;
          return (
            <div
              key={value}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(value);
                }
              }}
              className={`cursor-pointer rounded-lg border-2 p-5 text-center transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 ${ring} ${
                selected
                  ? `${ring} ring-2 border-transparent bg-muted/60`
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <Icon className={`mx-auto h-10 w-10 mb-3 ${color}`} />
              <p className="font-semibold">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Role-specific fields
// ---------------------------------------------------------------------------

const CREATOR_TYPES: { value: CreatorType; label: string }[] = [
  { value: "podcaster", label: "Podcaster" },
  { value: "musician", label: "Musician" },
  { value: "dj", label: "DJ" },
];

function StepRoleFields({
  userType,
  displayName,
  setDisplayName,
  artistName,
  setArtistName,
  creatorType,
  setCreatorType,
  employeeCode,
  setEmployeeCode,
  displayNameError,
}: {
  userType: UserType;
  displayName: string;
  setDisplayName: (v: string) => void;
  artistName: string;
  setArtistName: (v: string) => void;
  creatorType: CreatorType | null;
  setCreatorType: (v: CreatorType) => void;
  employeeCode: string;
  setEmployeeCode: (v: string) => void;
  displayNameError: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* Display name — shared across all roles */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          type="text"
          placeholder="Your display name"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {displayNameError && (
          <p className="text-sm text-destructive">{displayNameError}</p>
        )}
      </div>

      {/* Creator-specific fields */}
      {userType === "creator" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="artistName">Artist / Creator Name</Label>
            <Input
              id="artistName"
              type="text"
              placeholder="e.g., DJ Fresh, The Daily Vibe"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="flex flex-wrap gap-2">
              {CREATOR_TYPES.map(({ value, label }) => {
                const active = creatorType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCreatorType(value)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7401df] ${
                      active
                        ? "border-[#7401df] bg-[#7401df] text-white"
                        : "border-border text-muted-foreground hover:border-[#7401df]/60 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Employee-specific fields */}
      {userType === "employee" && (
        <div className="space-y-2">
          <Label htmlFor="employeeCode">Employee Invite Code</Label>
          <Input
            id="employeeCode"
            type="text"
            placeholder="e.g., WCCG-SALES-2026"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
          />
          <p className="text-xs text-muted-foreground">
            Enter the invite code provided by your manager
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Email & Password (uses react-hook-form + zod)
// ---------------------------------------------------------------------------

function StepCredentials({
  formProps,
}: {
  formProps: {
    register: ReturnType<typeof useForm<CredentialsFormValues>>["register"];
    errors: ReturnType<
      typeof useForm<CredentialsFormValues>
    >["formState"]["errors"];
    isLoading: boolean;
  };
}) {
  const { register, errors, isLoading } = formProps;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isLoading}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          disabled={isLoading}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          disabled={isLoading}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RegisterForm() {
  // ---- wizard state ----
  const [step, setStep] = useState(1);

  // ---- step 1 ----
  const [userType, setUserType] = useState<UserType | null>(null);

  // ---- step 2 ----
  const [displayName, setDisplayName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  // ---- step 3 / submission ----
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { supabase } = useSupabase();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
  });

  // ---- navigation helpers ----

  function handleContinue() {
    if (step === 1) {
      if (!userType) {
        toast.error("Please select a user type to continue.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // validate display name
      if (displayName.trim().length < 2) {
        setDisplayNameError("Display name must be at least 2 characters");
        return;
      }
      setDisplayNameError(null);

      // validate creator fields
      if (userType === "creator" && !creatorType) {
        toast.error("Please select a content type.");
        return;
      }

      // validate employee code
      if (userType === "employee" && employeeCode.trim().length === 0) {
        toast.error("Please enter your employee invite code.");
        return;
      }

      setStep(3);
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  // ---- submit ----

  async function onSubmit(data: CredentialsFormValues) {
    if (!userType) return;

    setIsLoading(true);
    try {
      const metadata: Record<string, string | undefined> = {
        display_name: displayName.trim(),
        user_type: userType,
      };

      if (userType === "creator") {
        metadata.creator_type = creatorType ?? undefined;
        metadata.artist_name = artistName.trim() || undefined;
      }

      if (userType === "employee") {
        metadata.employee_code = employeeCode.trim() || undefined;
      }

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSuccess(true);
      toast.success("Account created! Check your email to confirm.");
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Register error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // ---- success state ----

  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Click the link in your
            email to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Already confirmed?{" "}
            <Link
              href="/login"
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- headings per step ----

  const headings: Record<number, { title: string; description: string }> = {
    1: {
      title: "I am a...",
      description: "Select the role that fits you best",
    },
    2: {
      title: "Tell us about yourself",
      description:
        userType === "listener"
          ? "Just a name and you're good to go"
          : userType === "creator"
            ? "Set up your creator profile"
            : "Verify your employee access",
    },
    3: {
      title: "Create your credentials",
      description: "Set up your email and password to finish",
    },
  };

  // ---- render ----

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          {headings[step].title}
        </CardTitle>
        <CardDescription>{headings[step].description}</CardDescription>
      </CardHeader>

      <CardContent>
        <StepIndicator current={step} />

        {/* Wrap in form so step 3 can use handleSubmit */}
        <form
          onSubmit={
            step === 3
              ? handleSubmit(onSubmit)
              : (e) => {
                  e.preventDefault();
                  handleContinue();
                }
          }
          className="space-y-6"
        >
          {/* Step content */}
          {step === 1 && (
            <StepUserType userType={userType} onSelect={setUserType} />
          )}

          {step === 2 && userType && (
            <StepRoleFields
              userType={userType}
              displayName={displayName}
              setDisplayName={setDisplayName}
              artistName={artistName}
              setArtistName={setArtistName}
              creatorType={creatorType}
              setCreatorType={setCreatorType}
              employeeCode={employeeCode}
              setEmployeeCode={setEmployeeCode}
              displayNameError={displayNameError}
            />
          )}

          {step === 3 && (
            <StepCredentials
              formProps={{ register, errors, isLoading }}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}

            {step < 3 && (
              <Button
                type="submit"
                className="flex-1"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}

            {step === 3 && (
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  "Creating account..."
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Sign-in link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
