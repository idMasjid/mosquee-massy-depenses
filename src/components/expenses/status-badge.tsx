import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS, type ExpenseStatus } from "@/lib/constants";

export function StatusBadge({ status, className }: { status: ExpenseStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
