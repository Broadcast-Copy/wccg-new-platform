"use client";

import { useRouter } from "next/navigation";
import { Radio, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_CONFIGS, ROLE_IDS, type RoleId } from "./_lib/role-config";
import { useDemoRole } from "./layout";

export default function PortalRoleSelectPage() {
  const router = useRouter();
  const { setRole } = useDemoRole();

  function handleSelect(roleId: RoleId) {
    setRole(roleId);
    router.push("/portal/overview");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
          <Radio className="size-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          WCCG <span className="text-[#74ddc7]">Platform Portal</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select a role to explore the dashboard experience
        </p>
        <Badge
          variant="outline"
          className="mt-3 border-border text-muted-foreground"
        >
          Demo Mode — No real data is affected
        </Badge>
      </div>

      {/* Role Cards */}
      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_IDS.map((roleId) => {
          const config = ROLE_CONFIGS[roleId];
          const Icon = config.icon;
          return (
            <button
              key={roleId}
              onClick={() => handleSelect(roleId)}
              className="group text-left"
            >
              <Card className="border-border bg-card transition-all duration-200 hover:border-transparent hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background"
                style={{
                  // @ts-expect-error -- custom css property
                  "--hover-border": config.accentColor,
                }}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex size-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${config.accentColor}15` }}
                    >
                      <Icon
                        className="size-6"
                        style={{ color: config.accentColor }}
                      />
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" style={{ color: config.accentColor }} />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    {config.label}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {config.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-foreground"
                      style={{ backgroundColor: config.accentColor }}
                    >
                      {config.mockUser.initials}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {config.mockUser.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        You can switch roles at any time from the sidebar dropdown
      </p>
    </div>
  );
}
