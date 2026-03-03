"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDemoRole } from "../layout";
import { ROLE_CONFIGS } from "../_lib/role-config";
import { MOCK_DATA } from "../_lib/mock-data";

export default function PortalOverviewPage() {
  const { role } = useDemoRole();
  const router = useRouter();

  // Redirect to role selection if no role chosen
  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-[#74ddc7]" />
      </div>
    );
  }

  const config = ROLE_CONFIGS[role];
  const data = MOCK_DATA[role];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back,{" "}
          <span style={{ color: config.accentColor }}>
            {config.mockUser.name}
          </span>
        </h1>
        <p className="text-muted-foreground">
          Here is your {config.shortLabel.toLowerCase()} dashboard overview.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="border-white/10 bg-[#12121a] transition-shadow hover:shadow-md"
              style={{
                // @ts-expect-error -- custom property
                "--hover-shadow": `${config.accentColor}10`,
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardDescription>
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <Icon className={cn("size-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Jump to common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-white/10 bg-white/5"
                  style={{
                    // hover handled by a css pseudo-class fallback below
                  }}
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4" style={{ color: config.accentColor }} />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
              <CardDescription>Latest updates and notifications</CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-white/20 text-muted-foreground"
            >
              {data.activity.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-foreground/10"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${config.accentColor}15` }}
                  >
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.text}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Info Card */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="flex items-center gap-4 pt-6">
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${config.accentColor}15` }}
          >
            {(() => {
              const Icon = config.icon;
              return <Icon className="size-6" style={{ color: config.accentColor }} />;
            })()}
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              Viewing as {config.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {config.mockUser.email} &mdash; This is a demo dashboard. Switch
              roles anytime from the sidebar.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/portal">Change Role</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
