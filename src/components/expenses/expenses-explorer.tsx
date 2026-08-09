"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/expenses/status-badge";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { EXPENSE_STATUSES, STATUS_LABELS, type ExpenseStatus } from "@/lib/constants";

export type ExpenseRow = {
  id: string;
  entryDate: string;
  productTitle: string;
  supplierName: string;
  projectName: string;
  rubriqueLabel: string;
  totalTTCCents: number;
  status: ExpenseStatus;
};

const ALL = "__all__";

const columnHelper = createColumnHelper<ExpenseRow>();

const columns = [
  columnHelper.accessor("entryDate", {
    header: "Date",
    cell: (info) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(info.getValue())),
  }),
  columnHelper.accessor("productTitle", { header: "Titre" }),
  columnHelper.accessor("supplierName", { header: "Fournisseur" }),
  columnHelper.accessor("projectName", { header: "Projet" }),
  columnHelper.accessor("rubriqueLabel", { header: "Catégorie" }),
  columnHelper.accessor("totalTTCCents", {
    header: "Montant TTC",
    cell: (info) => formatEUR(info.getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Statut",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
];

export function ExpensesExplorer({
  expenses,
  projectNames,
  initialStatus,
}: {
  expenses: ExpenseRow[];
  projectNames: string[];
  initialStatus?: ExpenseStatus;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(initialStatus ?? ALL);
  const [project, setProject] = useState<string>(ALL);
  const [sorting, setSorting] = useState<SortingState>([{ id: "entryDate", desc: true }]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (status !== ALL && e.status !== status) return false;
      if (project !== ALL && e.projectName !== project) return false;
      if (term && !`${e.productTitle} ${e.supplierName}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [expenses, search, status, project]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== ALL) params.set("status", status);
    if (project !== ALL) params.set("project", project);
    if (search.trim()) params.set("search", search.trim());
    const query = params.toString();
    return `/api/expenses/export${query ? `?${query}` : ""}`;
  }, [search, status, project]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Rechercher un produit ou fournisseur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          items={{ [ALL]: "Tous les statuts", ...Object.fromEntries(EXPENSE_STATUSES.map((s) => [s, STATUS_LABELS[s]])) }}
          value={status}
          onValueChange={(v) => setStatus(v ?? ALL)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            {EXPENSE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{ [ALL]: "Tous les projets", ...Object.fromEntries(projectNames.map((p) => [p, p])) }}
          value={project}
          onValueChange={(v) => setProject(v ?? ALL)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Projet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les projets</SelectItem>
            {projectNames.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" nativeButton={false} render={<a href={exportUrl} />}>
          <Download className="size-4" />
          Exporter
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} dépense{filtered.length > 1 ? "s" : ""}
      </p>

      {/* Desktop table */}
      <Table containerClassName="hidden max-h-[70vh] overflow-y-auto rounded-xl border md:block">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "sticky top-0 z-10 bg-background",
                    header.column.id === "productTitle" && "max-w-[220px]",
                  )}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <ArrowUpDown className="size-3" />}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                Aucune dépense ne correspond aux filtres.
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => (window.location.href = `/expenses/${row.original.id}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cell.column.id === "productTitle" ? "max-w-[220px] truncate" : undefined}
                  title={cell.column.id === "productTitle" ? String(cell.getValue()) : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Aucune dépense ne correspond aux filtres.</p>
        )}
        {filtered.map((e) => (
          <Link
            key={e.id}
            href={`/expenses/${e.id}`}
            className="flex flex-col gap-1.5 rounded-xl border bg-card p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{e.productTitle}</span>
              <StatusBadge status={e.status} />
            </div>
            <span className="text-muted-foreground">{e.supplierName}</span>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>
                {e.projectName} · {e.rubriqueLabel}
              </span>
              <span className="font-medium text-foreground">{formatEUR(e.totalTTCCents)}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(e.entryDate))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
