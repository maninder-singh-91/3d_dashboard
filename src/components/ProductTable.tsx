import {
  ArrowDown,
  ArrowRight,
  Trash2,
  Download,
  Copy,
  Eye,
  EyeOff,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { ConsoleStatus, Product, Role } from "../lib/types";
import { team } from "../lib/seed";
import { ModelPreviewIcon } from "./Brand";
import ModelFileLink from "./ModelFileLink";
import { isLocalModel } from "../lib/modelReference";
import {
  Avatar,
  Empty,
  ExternalLink,
  Modal,
  ProductImage,
  StatusBadge,
} from "./UI";
export default function ProductTable({
  products: allProducts,
  onConsoleStatusChange,
  onOpen,
  onDelete,
  onPreview,
  onCopy,
  role,
  userId,
  completed = false,
  compact = false,
  catalogEmpty = false,
  initialConsoleFilter = "All",
  initialProductId,
}: {
  initialConsoleFilter?: ConsoleStatus | "All";
  initialProductId?: string;
  catalogEmpty?: boolean;
  products: Product[];
  onConsoleStatusChange: (
    ids: string[],
    status: ConsoleStatus,
  ) => Promise<void>;
  onOpen: (p: Product) => void;
  onDelete: (p: Product) => Promise<void>;
  onPreview: (p: Product) => void;
  onCopy: (s: string, kind?: "url" | "uid") => void;
  role: Role;
  userId: string;
  completed?: boolean;
  compact?: boolean;
}) {
  const [consoleFilter, setConsoleFilter] = useState<ConsoleStatus | "All">(
    initialConsoleFilter,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [consoleError, setConsoleError] = useState("");
  const products = allProducts.filter(
    (p) =>
      consoleFilter === "All" || (p.consoleStatus ?? "Draft") === consoleFilter,
  );
  const size = 10;
  const [page, setPage] = useState(() =>
    Math.floor(Math.max(0, products.findIndex((p) => p.id === initialProductId)) / size),
  );
  const selected = products.filter((p) => selectedIds.has(p.id));
  const canSelect = role === "Admin / Manager";
  const allPublished = selected.length > 0 && selected.every((p) => p.consoleStatus === "Published");
  const allUnpublished = selected.length > 0 && selected.every((p) => p.consoleStatus !== "Published");
  async function changeConsoleStatus(status: ConsoleStatus) {
    if (updating || !canSelect || (status === "Draft" ? !allPublished : !allUnpublished)) return;
    setUpdating(true);
    setConsoleError("");
    try {
      await onConsoleStatusChange(
        selected.map((p) => p.id),
        status,
      );
      setSelectedIds(new Set());
    } catch (error) {
      setConsoleError((error as Error).message);
    } finally {
      setUpdating(false);
    }
  }
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const totalPages = Math.max(1, Math.ceil(products.length / size));
  const safePage = Math.min(page, totalPages - 1);
  const currentPage = safePage + 1;
  const pageNumbers: (number | string)[] =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : currentPage <= 4
        ? [1, 2, 3, 4, 5, "end-gap", totalPages]
        : currentPage >= totalPages - 3
          ? [
              1,
              "start-gap",
              totalPages - 4,
              totalPages - 3,
              totalPages - 2,
              totalPages - 1,
              totalPages,
            ]
          : [
              1,
              "start-gap",
              currentPage - 1,
              currentPage,
              currentPage + 1,
              "end-gap",
              totalPages,
            ];
  const rows = products.slice(safePage * size, (safePage + 1) * size);
  const allRowsSelected =
    rows.length > 0 && rows.every((p) => selectedIds.has(p.id));
  const someRowsSelected = rows.some((p) => selectedIds.has(p.id));
  return (
    <>
      <div className="console-list-toolbar">
        <div
          className="console-list-filters"
          role="group"
          aria-label="Filter by console status"
        >
          {(["All", "Published", "Draft"] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={consoleFilter === status}
              disabled={updating}
              onClick={() => {
                setConsoleFilter(status);
                setPage(0);
                setSelectedIds(new Set());
                setConsoleError("");
              }}
            >
              {status === "All" ? "All console statuses" : status === "Draft" ? "Unpublished" : status}
              <span>
                {
                  allProducts.filter(
                    (p) =>
                      status === "All" ||
                      (p.consoleStatus ?? "Draft") === status,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        {canSelect && selected.length > 0 && (
          <div className="console-bulk-actions" role="region" aria-label="Bulk publishing actions" aria-busy={updating}>
            <div className="console-bulk-copy" role="status">
              <strong>{selected.length} {selected.length === 1 ? "SKU" : "SKUs"} selected</strong>
              <span>{allPublished
                ? "Use published-only selections to unpublish products."
                : allUnpublished
                  ? "Use unpublished-only selections to publish products."
                  : "Select only published or only unpublished products to continue."}</span>
            </div>
            <div className="console-bulk-buttons">
              {selected.length < products.length && (
                <button type="button" className="console-bulk-select-all" disabled={updating}
                  onClick={() => setSelectedIds(new Set(products.map((p) => p.id)))}>
                  Select all {products.length}
                </button>
              )}
              <button type="button" className="console-bulk-clear" disabled={updating}
                onClick={() => { setSelectedIds(new Set()); setConsoleError(""); }}>
                <X size={16} /> Clear
              </button>
              {(allPublished || !allUnpublished) && (
                <button type="button" className="console-bulk-submit" disabled={updating || !allPublished}
                  onClick={() => void changeConsoleStatus("Draft")}>
                  <EyeOff size={16} /> {updating ? "Unpublishing…" : `Unpublish ${selected.length}`}
                </button>
              )}
              {(allUnpublished || !allPublished) && (
                <button type="button" className="console-bulk-submit" disabled={updating || !allUnpublished}
                  onClick={() => void changeConsoleStatus("Published")}>
                  <Eye size={16} /> {updating ? "Publishing…" : `Publish ${selected.length}`}
                </button>
              )}
            </div>
          </div>
        )}
        {consoleError && (
          <p className="console-list-error" role="alert">
            {consoleError}
          </p>
        )}
      </div>
      <div className="table-scroll">
        <table className={compact ? "compact-table" : ""}>
          <thead>
            <tr>
              {canSelect && (
                <th className="console-checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all products on this page"
                    checked={allRowsSelected}
                    ref={(node) => {
                      if (node)
                        node.indeterminate =
                          someRowsSelected && !allRowsSelected;
                    }}
                    disabled={updating || !rows.length}
                    onChange={() =>
                      setSelectedIds((previous) => {
                        const next = new Set(previous);
                        rows.forEach((p) =>
                          allRowsSelected ? next.delete(p.id) : next.add(p.id),
                        );
                        return next;
                      })
                    }
                  />
                </th>
              )}
              <th className="product-column">
                Product <ArrowDown size={12} />
              </th>
              <th>Product UID</th>
              {!compact && <th>SKU</th>}
              <th>Category</th>
              <th>Brand</th>
              {!compact && <th>Product source</th>}
              <th>{completed ? "Review" : "Status"}</th>
              <th>Console status</th>
              <th>Assignee</th>
              <th>{completed ? "Approved" : "Batch"}</th>
              {!compact && !completed && <th>Review</th>}
              <th>3D model</th>
              <th className="action-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!products.length && (
              <tr className="product-table-empty-row">
                <td colSpan={10 + Number(canSelect) + (compact ? 0 : 2) + Number(!compact && !completed)}>
                  <Empty text={catalogEmpty ? "Import your catalog to view products." : undefined} />
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const member = team.find((t) => t.id === p.assigneeId);
              return (
                <tr key={p.id}>
                  {canSelect && (
                    <td className="console-checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}, SKU ${p.sku}`}
                        checked={selectedIds.has(p.id)}
                        disabled={updating}
                        onChange={() =>
                          setSelectedIds((previous) => {
                            const next = new Set(previous);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          })
                        }
                      />
                    </td>
                  )}
                  <td>
                    <button className="product-cell" onClick={() => onOpen(p)}>
                      <ProductImage product={p} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>SKU {p.sku}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <div className="product-uid-cell">
                      <span className="mono" title={p.id}>
                        {p.id}
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Copy Product UID for ${p.name}`}
                        title="Copy Product UID"
                        onClick={() => onCopy(p.id, "uid")}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  {!compact && <td className="muted mono">{p.sku}</td>}
                  <td>
                    <span className="category-cell">{p.category}</span>
                  </td>
                  <td>
                    <span className="brand-badge">{p.brand}</span>
                  </td>
                  {!compact && (
                    <td>
                      <ExternalLink url={p.productUrl}>
                        View Product
                      </ExternalLink>
                    </td>
                  )}
                  <td>
                    <StatusBadge
                      status={completed ? p.reviewStatus : p.status}
                    />
                  </td>
                  <td>
                    <span
                      className={`console-status-badge ${p.consoleStatus === "Published" ? "published" : "draft"}`}
                    >
                      {p.consoleStatus === "Published" ? "Published" : "Unpublished"}
                    </span>
                  </td>
                  <td>
                    {member ? (
                      <span className="assignee">
                        <Avatar member={member} small />
                        <span>
                          {member.id === userId
                            ? "You"
                            : member.name.split(" ")[0]}
                        </span>
                      </span>
                    ) : (
                      <span className="unassigned">
                        <span className="dashed-avatar">—</span>Unassigned
                      </span>
                    )}
                  </td>
                  <td className="muted">
                    {completed
                      ? p.approvedAt
                        ? new Date(p.approvedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"
                      : `#${p.batchId}`}
                  </td>
                  {!compact && !completed && (
                    <td>
                      <span className="review-text">{p.reviewStatus}</span>
                    </td>
                  )}
                  <td>
                    {p.modelUrl ? (
                      <div className="row model-actions">
                        <button
                          className="icon-button purple"
                          title="Preview GLB"
                          aria-label={`Preview ${p.name}`}
                          onClick={() => onPreview(p)}
                        >
                          <ModelPreviewIcon size={20} />
                        </button>
                        {completed && (
                          <>
                            <ModelFileLink source={p.modelUrl} filename={`${p.sku}-model.glb`} className="icon-button" title="Download GLB">
                              <Download size={15} />
                            </ModelFileLink>
                            {!isLocalModel(p.modelUrl) && <button
                              className="icon-button"
                              title="Copy model URL"
                              onClick={() => onCopy(p.modelUrl)}
                            >
                              <Copy size={14} />
                            </button>}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="product-row-actions">
                      <button className="open-task" onClick={() => onOpen(p)}>
                        {completed ? <Eye size={14} /> : null}
                        {completed ? "View" : "Open Task"}
                        <ArrowRight size={16} />
                      </button>
                      {role === "Admin / Manager" && (
                        <button
                          className="icon-button product-delete"
                          title="Delete product"
                          aria-label={`Delete ${p.name}`}
                          onClick={() => {
                            setDeleting(p);
                            setError("");
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="table-footer">
        <span>
          Showing {products.length ? safePage * size + 1 : 0}–
          {Math.min((safePage + 1) * size, products.length)} of{" "}
          {products.length} products
        </span>
        <nav className="pagination" aria-label="Product pages">
          <button
            aria-label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          {pageNumbers.map((number) =>
            typeof number === "string" ? (
              <span
                key={number}
                className="pagination-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={number}
                className={currentPage === number ? "current" : ""}
                aria-label={`Page ${number}`}
                aria-current={currentPage === number ? "page" : undefined}
                onClick={() => setPage(number - 1)}
              >
                {number}
              </button>
            ),
          )}
          <button
            aria-label="Next page"
            disabled={(safePage + 1) * size >= products.length}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </nav>
      </footer>
      {deleting && (
        <Modal
          title="Delete product?"
          subtitle={deleting.name}
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <div className="delete-product-message">
            <p>
              This removes the product and its production details from this
              workspace.
            </p>
            {error && (
              <p role="alert" className="delete-product-error">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onDelete(deleting);
                  setDeleting(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={16} />
              {busy ? "Deleting…" : "Delete product"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
