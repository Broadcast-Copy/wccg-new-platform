"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Radio, type LucideIcon } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MobileNavProps {
  navLinks: NavLink[];
}

export function MobileNav({ navLinks }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            WCCG 104.5
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
