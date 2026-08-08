"use client";

import { useId, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export { arrayMove };

export function SortableGroup({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (orderedIds: string[]) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // dnd-kit falls back to a module-level counter for its a11y announcement
  // ids when no `id` is given, which drifts between the server and client
  // render passes (each nested DndContext bumps it differently) and trips a
  // hydration mismatch. useId() is deterministic across both, so pass it
  // through explicitly.
  const contextId = useId();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function useSortableItem(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return {
    setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    },
    dragHandleProps: { ...attributes, ...listeners },
    isDragging,
  };
}

export function DragHandle({
  dragHandleProps,
  className,
}: {
  dragHandleProps: Record<string, unknown>;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing",
        className,
      )}
      aria-label="Réorganiser (glisser-déposer)"
      {...dragHandleProps}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
