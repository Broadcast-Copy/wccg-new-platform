"use client";

import { ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ROLE_CONFIGS, ROLE_IDS, type RoleId } from "../_lib/role-config";
import { useRouter } from "next/navigation";

interface RoleSwitcherProps {
  currentRole: RoleId;
  onRoleChange: (role: RoleId) => void;
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const router = useRouter();
  const current = ROLE_CONFIGS[currentRole];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground hover:bg-foreground/10"
        >
          <span className="flex items-center gap-2">
            <span
              className="flex size-6 items-center justify-center rounded-full"
              style={{ backgroundColor: `${current.accentColor}20` }}
            >
              <CurrentIcon className="size-3.5" style={{ color: current.accentColor }} />
            </span>
            <span className="truncate">{current.shortLabel}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 border-border bg-popover"
      >
        {ROLE_IDS.map((roleId) => {
          const role = ROLE_CONFIGS[roleId];
          const Icon = role.icon;
          const isActive = roleId === currentRole;
          return (
            <DropdownMenuItem
              key={roleId}
              onClick={() => onRoleChange(roleId)}
              className={`flex items-center gap-2 ${isActive ? "bg-foreground/10" : "hover:bg-foreground/5"}`}
            >
              <span
                className="flex size-5 items-center justify-center rounded-full"
                style={{ backgroundColor: `${role.accentColor}20` }}
              >
                <Icon className="size-3" style={{ color: role.accentColor }} />
              </span>
              <span className={isActive ? "font-medium text-foreground" : "text-muted-foreground"}>
                {role.label}
              </span>
              {isActive && (
                <span
                  className="ml-auto size-2 rounded-full"
                  style={{ backgroundColor: role.accentColor }}
                />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-foreground/10" />
        <DropdownMenuItem
          onClick={() => router.push("/portal")}
          className="flex items-center gap-2 text-muted-foreground hover:bg-foreground/5"
        >
          <LogOut className="size-4" />
          Change Role
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
