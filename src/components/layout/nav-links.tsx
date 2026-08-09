"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemsForRole, isNavGroup, type NavItem, type NavGroup } from "@/lib/nav";
import type { Role } from "@/lib/constants";

function isChildActive(pathname: string, children: NavItem[]) {
  return children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
}

function NavLink({ item, isActive, onNavigate, indented }: { item: NavItem; isActive: boolean; onNavigate?: () => void; indented?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        indented && "pl-9",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function NavGroupItem({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate?: () => void }) {
  const childActive = isChildActive(pathname, group.children);
  const [open, setOpen] = useState(childActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          childActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-1">
          {group.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              indented
              onNavigate={onNavigate}
              isActive={pathname === child.href || pathname.startsWith(`${child.href}/`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) =>
        isNavGroup(item) ? (
          <NavGroupItem key={item.label} group={item} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <NavLink
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          />
        ),
      )}
    </nav>
  );
}
