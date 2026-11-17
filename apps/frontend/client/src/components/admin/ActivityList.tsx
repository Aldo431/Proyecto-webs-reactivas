import type { AdminActivity } from "@tiendadcc/utils";
import { describeActivity, formatRelativeTime } from "../../logic/adminFormat.ts";

interface ActivityListProps {
  events: AdminActivity[];
  now: Date;
}

// "Actividad reciente" (spec 013, RF-10): `@usuario` en font-mono, el texto
// según el tipo de evento y el tiempo relativo.
export function ActivityList({ events, now }: ActivityListProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay actividad.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event, index) => {
        const { user, text } = describeActivity(event);
        return (
          <li
            key={`${event.type}-${event.at}-${index}`}
            className="flex flex-col gap-0.5 text-sm"
          >
            <span>
              <span className="font-mono text-foreground">{user}</span>{" "}
              <span className="text-muted-foreground">{text}</span>
            </span>
            <time dateTime={event.at} className="text-xs text-muted-foreground">
              {formatRelativeTime(event.at, now)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
