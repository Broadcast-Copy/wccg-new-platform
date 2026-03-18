"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export function ChannelRedirect() {
  const params = useParams<{ streamId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/shows?stream=${params.streamId}`);
  }, [router, params.streamId]);

  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to Show Directory...</p>
    </div>
  );
}
