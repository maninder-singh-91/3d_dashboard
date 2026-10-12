import { useState } from "react";
import type { Product, Role } from "../lib/types";
import type { Action } from "../lib/workflow";
import { productStatusLabel, productStatusOptions } from "../lib/productStatus";
import TaskStatusButtons from "./TaskStatusButtons";
import TaskAssignee from "./TaskAssignee";

export default function ProductDetailsCard({
  product,
  role,
  userId,
  onUpdate,
}: {
  product: Product;
  role: Role;
  userId: string;
  onUpdate: (action: Action) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const statusLabel = productStatusLabel(product.status);
  const editable =
    role === "Admin / Manager" ||
    (role === "3D Artist" &&
      (product.assigneeId === userId ||
        (!product.assigneeId && statusLabel === "To do")));
  async function changeStatus(value: string) {
    const option = productStatusOptions.find(
      (status) => status.value === value,
    );
    if (!option || !editable || busy) return;
    setBusy(true);
    setError("");
    try {
      await onUpdate({ type: "catalog-status", status: option.value });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="todo-info panel" aria-label="Task status">
      <dl>
        <TaskAssignee assigneeId={product.assigneeId} canAssign={role === "Admin / Manager" && !["Review", "Done"].includes(statusLabel)}
          onAssign={(assigneeId) => onUpdate({ type: "assign", assigneeId })} />
        <div>
          <dt>Status</dt>
          <dd className="todo-status-select">
            <TaskStatusButtons product={product} role={role} userId={userId} busy={busy}
              onChange={(value) => void changeStatus(value)} />
          </dd>
        </div>
      </dl>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
