"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { Cockpit } from "@/components/cockpit";

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Cockpit />
      </AppShell>
    </AuthGuard>
  );
}
