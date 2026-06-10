"use client";

/** Tiny avatar with initials fallback, shared by the arcade leaderboard. */
export function ArcadeAvatar({
  name,
  url,
  size = "sm",
}: {
  name: string;
  url: string | null;
  size?: "sm" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-14 w-14 text-sm"
      : "h-8 w-8 text-[10px]";

  if (url) {
    // Plain <img> — bypasses next/image domain checks; avatars are small.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${cls} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df] to-[#74ddc7] font-black text-white`}
    >
      {initials || "WC"}
    </span>
  );
}
