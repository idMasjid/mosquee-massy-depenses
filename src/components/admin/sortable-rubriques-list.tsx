"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SortableGroup, useSortableItem, DragHandle } from "@/components/ui/sortable";
import { reorderRubriques } from "@/lib/actions/rubrique-actions";
import { EditRubriqueDialog } from "@/components/admin/edit-rubrique-dialog";
import { DeleteRubriqueButton } from "@/components/admin/delete-rubrique-button";

type RubriqueItem = { id: string; rubrique: string; lineCount: number };

export function SortableRubriquesList({ projectId, rubriques }: { projectId: string; rubriques: RubriqueItem[] }) {
  const [items, setItems] = useState(rubriques);
  const [prevRubriques, setPrevRubriques] = useState(rubriques);
  const [, startTransition] = useTransition();

  if (rubriques !== prevRubriques) {
    setPrevRubriques(rubriques);
    setItems(rubriques);
  }

  if (items.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Aucune catégorie autorisée pour ce projet.</p>;
  }

  const ids = items.map((r) => r.id);

  function handleReorder(orderedIds: string[]) {
    const previous = items;
    const reordered = orderedIds.map((id) => items.find((r) => r.id === id)!);
    setItems(reordered);
    startTransition(async () => {
      const result = await reorderRubriques(projectId, orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  return (
    <SortableGroup ids={ids} onReorder={handleReorder}>
      <ul className="flex flex-col divide-y">
        {items.map((r) => (
          <RubriqueRow key={r.id} id={r.id} rubrique={r.rubrique} lineCount={r.lineCount} />
        ))}
      </ul>
    </SortableGroup>
  );
}

function RubriqueRow({ id, rubrique, lineCount }: RubriqueItem) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(id);
  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
      <span className="flex items-center gap-2">
        <DragHandle dragHandleProps={dragHandleProps} />
        {rubrique}
      </span>
      <div className="flex items-center gap-1">
        <EditRubriqueDialog id={id} rubrique={rubrique} lineCount={lineCount} />
        <DeleteRubriqueButton id={id} rubrique={rubrique} lineCount={lineCount} />
      </div>
    </li>
  );
}
