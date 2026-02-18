"use client";

export function FavoritesList() {
  // TODO: Fetch user favorites from API
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Your favorite shows and streams will appear here. Browse{" "}
          <a href="/shows" className="underline hover:text-foreground">
            shows
          </a>{" "}
          or{" "}
          <a href="/channels" className="underline hover:text-foreground">
            channels
          </a>{" "}
          to add favorites.
        </p>
      </div>
    </div>
  );
}
