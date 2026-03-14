"use client";

interface SponsorBadgeProps {
  sponsorName: string;
  sponsorLogo?: string;
}

export function SponsorBadge({ sponsorName, sponsorLogo }: SponsorBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
      {sponsorLogo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={sponsorLogo}
          alt={`${sponsorName} logo`}
          className="h-3.5 w-3.5 rounded-sm object-contain"
        />
      )}
      <span className="text-[10px] text-muted-foreground">
        Powered by <span className="font-medium text-foreground/70">{sponsorName}</span>
      </span>
    </div>
  );
}
