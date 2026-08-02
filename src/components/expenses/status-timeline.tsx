import { StatusBadge } from "@/components/expenses/status-badge";
import type { ExpenseStatus } from "@/lib/constants";

export type StatusEventItem = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date;
  byUser: { name: string };
};

export function StatusTimeline({ events }: { events: StatusEventItem[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-1 border-l-2 border-border pl-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={event.toStatus as ExpenseStatus} />
            <span className="text-muted-foreground">par {event.byUser.name}</span>
            <span className="text-muted-foreground">
              · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}
            </span>
          </div>
          {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}
