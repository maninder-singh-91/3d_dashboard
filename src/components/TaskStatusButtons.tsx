import type { Product, Role } from "../lib/types";
import { productStatusLabel, productStatusOptions } from "../lib/productStatus";

export default function TaskStatusButtons({ product, role, userId, busy, onChange }: {
  product: Product;
  role: Role;
  userId: string;
  busy: boolean;
  onChange: (value: string) => void;
}) {
  const current = productStatusLabel(product.status);
  const editable = role === "Admin / Manager" ||
    (role === "3D Artist" && (product.assigneeId === userId || (!product.assigneeId && current === "To do")));
  return <div className="task-status-buttons" role="group" aria-label="Task status">
    {productStatusOptions.filter(({ value }) => value !== "Available" || current === "To do").map(({ value, label }) => {
      const active = current === label;
      return <button key={value} type="button" aria-pressed={active}
        className={`task-status-option${active ? ` status-${value.toLowerCase().replaceAll(" ", "-")}` : ""}`}
        disabled={busy || product.singleProductDraft || !editable || (value === "Available" && role !== "Admin / Manager" && !active)}
        onClick={() => { if (!active) onChange(value); }}>
        <span className="task-status-dot" aria-hidden="true" />{label}
      </button>;
    })}
  </div>;
}
