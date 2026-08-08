"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DivergingBarList, type DivergingBarDatum } from "@/components/dashboard/diverging-bar-list";
import { reorderProjectsDashboard } from "@/lib/actions/project-actions";

export function SortableProjectBudgetPanel({ data }: { data: DivergingBarDatum[] }) {
  const [items, setItems] = useState(data);
  const [prevData, setPrevData] = useState(data);
  const [, startTransition] = useTransition();

  if (data !== prevData) {
    setPrevData(data);
    setItems(data);
  }

  function handleReorder(orderedIds: string[]) {
    const previous = items;
    const reordered = orderedIds.map((id) => items.find((d) => d.id === id)!);
    setItems(reordered);
    startTransition(async () => {
      const result = await reorderProjectsDashboard(orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  return <DivergingBarList data={items} onReorder={handleReorder} />;
}
