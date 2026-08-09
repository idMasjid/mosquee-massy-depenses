"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importExpenses, type ImportResult } from "@/lib/actions/expense-import-actions";

export function ImportExpensesForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choisissez d'abord un fichier.");
      return;
    }
    setImporting(true);
    setResult(null);
    const formData = new FormData();
    formData.set("file", file);
    const res = await importExpenses(formData);
    setImporting(false);
    setResult(res);
    if (!res.success) {
      toast.error(res.error);
    } else {
      toast.success(`${res.imported} dépense${res.imported > 1 ? "s" : ""} importée${res.imported > 1 ? "s" : ""}.`);
      if (inputRef.current) inputRef.current.value = "";
      setFileName(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <Button type="button" variant="outline" size="sm" disabled={importing} onClick={() => inputRef.current?.click()}>
          <FileUp className="size-4" />
          Choisir un fichier
        </Button>
        <span className="flex-1 truncate text-sm text-muted-foreground">
          {fileName ?? "Aucun fichier sélectionné."}
        </span>
        <Button type="button" size="sm" disabled={importing || !fileName} onClick={handleSubmit}>
          <Upload className="size-4" />
          {importing ? "Import en cours…" : "Importer"}
        </Button>
      </div>

      {result?.success && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            {result.imported} importée{result.imported > 1 ? "s" : ""}
            {result.skipped > 0 && `, ${result.skipped} ignorée${result.skipped > 1 ? "s" : ""}`}
          </div>
          {result.errors.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {result.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          )}
          {result.imported > 0 && (
            <Button size="sm" nativeButton={false} render={<Link href="/expenses?status=IMPORT_A_VALIDER" />}>
              Voir les imports à valider
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
