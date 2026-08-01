"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { Fleet } from "@/components/fleet";

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Fleet />
      </AppShell>
    </AuthGuard>
  );
}
