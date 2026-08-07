"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/layout/logo";
import type { Role } from "@/lib/constants";

export function Topbar({
  user,
}: {
  user: { name: string; email: string; image?: string | null; role: Role };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu" />}
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="flex-row items-center gap-2.5 border-b">
            <Logo className="h-8" />
            <SheetTitle>Dépenses — Mosquée de Massy</SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NavLinks role={user.role} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <Logo className="h-7" />
      </Link>

      <div className="flex-1" />

      <UserMenu name={user.name} email={user.email} image={user.image} role={user.role} />
    </header>
  );
}
