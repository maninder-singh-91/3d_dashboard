import { team } from "../lib/seed";
import { Avatar } from "./UI";

export default function TaskAssignee({ assigneeId }: { assigneeId: string | null }) {
  const member = team.find((person) => person.id === assigneeId);
  return (
    <div className="task-assignee">
      <dt>Assignee</dt>
      <dd>
        <Avatar member={member} />
        <span>{member?.name || (assigneeId ? "Unknown assignee" : "Unassigned")}</span>
      </dd>
    </div>
  );
}
