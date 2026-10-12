import { team } from "../lib/seed";
import { Avatar } from "./UI";
import { useState } from "react";

export default function TaskAssignee({ assigneeId, onAssign, canAssign = false }: {
  assigneeId: string | null;
  onAssign?: (id: string) => Promise<void>;
  canAssign?: boolean;
}) {
  const member = team.find((person) => person.id === assigneeId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);
  async function assign(id: string) {
    if (!onAssign || !canAssign || busy) return;
    setBusy(true);
    setError("");
    try { await onAssign(id); setChoosing(false); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="task-assignee">
      <dt>Assignee {assigneeId && canAssign && onAssign && <button type="button" className="task-assignee-change"
        disabled={busy} aria-expanded={choosing} onClick={() => setChoosing((value) => !value)}>{choosing ? "Cancel" : "Change"}</button>}</dt>
      <dd>
        {(assigneeId || !onAssign) && <Avatar member={member} />}
        <span>{member?.name || (assigneeId ? "Unknown assignee" : "Unassigned")}</span>
        {(!assigneeId || choosing) && onAssign && <div className="task-assignee-options" role="group" aria-label="Assign to team member">
          {team.filter((person) => person.role !== "Reviewer").map((person) =>
            <button key={person.id} type="button" className="task-assignee-choice" disabled={busy || !canAssign}
              aria-label={`Assign to ${person.name}`} aria-pressed={person.id === assigneeId} title={person.name} onClick={() => void assign(person.id)}>
              <Avatar member={person} />
            </button>)}
        </div>}
      </dd>
      {error && <dd className="error-banner" role="alert">{error}</dd>}
    </div>
  );
}
