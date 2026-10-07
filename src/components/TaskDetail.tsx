import { lazy, Suspense, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Copy,
  Download,
  MessageSquare,
  Send,
  Clock,
  ChevronDown,
} from "lucide-react";
import type { Product, Role, Batch } from "../lib/types";
import { checklistLabels } from "../lib/types";
import type { Action } from "../lib/workflow";
import { team } from "../lib/seed";
import { ModelPreviewIcon } from "./Brand";
import { Avatar, ProductImage, StatusBadge, Modal } from "./UI";
import AIGeneration from "./AIGeneration";
import ThemedSelect from "./ThemedSelect";
import ProductSpecifications from "./ProductSpecifications";
import TodoTaskDetail from "./TodoTaskDetail";
import CompletedTaskDetail from "./CompletedTaskDetail";
import { productStatusLabel } from "../lib/productStatus";
import { isLocalModel } from "../lib/modelReference";
import ModelFileLink from "./ModelFileLink";
const ModelStage = lazy(() =>
  import("./ModelViewer").then((module) => ({ default: module.ModelStage })),
);

export default function TaskDetail({
  product: p,
  role,
  userId,
  batches,
  onBack,
  onUpdate,
  onPublish,
  onCopy,
}: {
  product: Product;
  role: Role;
  userId: string;
  batches: Batch[];
  onBack: () => void;
  onUpdate: (a: Action) => Promise<void>;
  onPublish: () => Promise<void>;
  onCopy: (value: string, kind?: "url" | "uid") => void;
}) {
  const [url, setUrl] = useState(p.modelUrl);
  const [demoPreview, setDemoPreview] = useState(false);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  const previewUrl = demoPreview
    ? "/models/studio-chair.glb"
    : p.modelUrl || "/models/studio-chair.glb";
  const [comment, setComment] = useState("");
  const [correction, setCorrection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const owner =
    role === "Admin / Manager" ||
    (role === "3D Artist" && p.assigneeId === userId);
  const editable =
    owner &&
    ["Claimed", "In Progress", "Corrections Required"].includes(p.status);
  const reviewer = role !== "3D Artist";
  const canAssign =
    role === "Admin / Manager" &&
    !["Completed", "In Review", "Submitted", "Approved"].includes(p.status);
  const member = team.find((t) => t.id === p.assigneeId);
  const percent = p.checklist.filter(Boolean).length * 10;
  async function run(action: Action) {
    setBusy(true);
    setError("");
    try {
      await onUpdate(action);
      if (action.type === "save") setDemoPreview(false);
      if (action.type === "correct") setCorrection(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (["Review", "Done"].includes(productStatusLabel(p.status))) {
    return (
      <CompletedTaskDetail
        product={p}
        role={role}
        userId={userId}
        onBack={onBack}
        onUpdate={onUpdate}
        onPublish={onPublish}
        onCopy={onCopy}
      />
    );
  }
  if (["To do", "In Progress", "Hold"].includes(productStatusLabel(p.status))) {
    return (
      <TodoTaskDetail
        product={p}
        role={role}
        userId={userId}
        batches={batches}
        onBack={onBack}
        onUpdate={onUpdate}
        onCopy={onCopy}
      />
    );
  }
  const date = (v: string | null) =>
    v
      ? new Date(v).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to workspace
      </button>
      <div className="detail-heading detail-heading-expanded">
        <div className="detail-title">
          <div className="eyebrow">
            PRODUCT WORKSPACE <span> / {p.sku}</span>
          </div>
          <div className="detail-title-row">
            <h1>{p.name}</h1>
          </div>
          <div className="detail-title-footer">
            <StatusBadge status={p.status} />
            <p>
              {p.brand} <span>·</span> {p.category} <span>·</span>{" "}
              {p.difficulty} complexity
            </p>{" "}
          </div>
        </div>
        <div className="detail-header-summary">
          <dl className="detail-header-meta">
            <div>
              <dt>Assigned to</dt>
              <dd>
                {canAssign ? (
                  <ThemedSelect
                    label="Assign task"
                    value={p.assigneeId || ""}
                    disabled={busy}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...team
                        .filter((t) => t.role !== "Reviewer")
                        .map((t) => ({
                          value: t.id,
                          label: t.id === userId ? "You" : t.name,
                        })),
                    ]}
                    onChange={(assigneeId) =>
                      void run({
                        type: "assign",
                        assigneeId: assigneeId || null,
                      })
                    }
                  />
                ) : member ? (
                  <span className="assignee">
                    <Avatar member={member} />
                    {member.id === userId ? "You" : member.name}
                  </span>
                ) : (
                  "Unassigned"
                )}
              </dd>
            </div>
            <div>
              <dt>Batch</dt>
              <dd>
                {batches.find((b) => b.id === p.batchId)?.name ||
                  `#${p.batchId}`}
              </dd>
            </div>
          </dl>
          <div className="reference-summary header-reference">
            <a
              href={p.productUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`View original product: ${p.name}`}
            >
              <ProductImage product={p} className="reference-thumbnail" />
            </a>
            <div>
              <strong>Product reference</strong>
              <a
                className="text-button"
                href={p.productUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open product page <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <section
            className="panel model-preview-panel"
            aria-label="3D model workspace"
          >
            <div className="section-title">
              <h3>
                <ModelPreviewIcon size={21} /> 3D model
              </h3>
              {hasGeneratedPreview ? (
                <div
                  className="model-source-switch"
                  role="group"
                  aria-label="Model shown in viewport"
                >
                  <button
                    type="button"
                    aria-pressed={!demoPreview}
                    onClick={() => setDemoPreview(false)}
                  >
                    {p.modelUrl ? "Uploaded model" : "Demo model"}
                  </button>
                  <button
                    type="button"
                    aria-pressed={demoPreview}
                    onClick={() => setDemoPreview(true)}
                  >
                    AI generated · Demo
                  </button>
                </div>
              ) : (
                <span className="file-badge">
                  {p.modelUrl ? "Uploaded model · GLB" : "Demo model · GLB"}
                </span>
              )}
            </div>
            <Suspense
              fallback={
                <div className="model-stage-placeholder" role="status">
                  Loading 3D viewer…
                </div>
              }
            >
              <ModelStage
                key={previewUrl}
                url={previewUrl}
                name={
                  demoPreview || !p.modelUrl
                    ? "Sample chair — demo preview"
                    : p.name
                }
              />
            </Suspense>
            <div className="model-delivery">
              {!isLocalModel(p.modelUrl) && <div className="field">
                <label htmlFor="model-url">GLB URL</label>
                <div className="input-with-button">
                  <input
                    id="model-url"
                    value={url}
                    readOnly={!editable}
                    placeholder="https://storage.example.com/model.glb"
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  {editable && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => run({ type: "save", modelUrl: url })}
                    >
                      Save URL
                    </button>
                  )}
                </div>
              </div>}
              {p.modelUrl && (
                <div className="row model-links">
                  <ModelFileLink source={p.modelUrl} filename={`${p.sku}-model.glb`} title="Download GLB">
                    <Download size={14} />
                    Download GLB
                  </ModelFileLink>
                  {!isLocalModel(p.modelUrl) && <button onClick={() => onCopy(p.modelUrl)}>
                    <Copy size={14} />
                    Copy URL
                  </button>}
                </div>
              )}
            </div>
          </section>
          <ProductSpecifications
            product={p}
            onCopy={(value) => onCopy(value, "uid")}
            editable={role === "Admin / Manager" || editable}
            onUpdate={onUpdate}
          />
          {p.reviewComment && (
            <section
              className={`review-comment ${p.status === "Corrections Required" ? "needs-correction" : ""}`}
            >
              <MessageSquare size={20} />
              <div>
                <h3>
                  {p.status === "Corrections Required"
                    ? "A few refinements needed"
                    : "Previous review feedback"}
                </h3>
                <p>{p.reviewComment}</p>
              </div>
            </section>
          )}
        </div>
        <aside className="detail-aside">
          <AIGeneration
            key={p.id}
            productId={p.id}
            onDemoPreview={() => {
              setHasGeneratedPreview(true);
              setDemoPreview(true);
            }}
          />
          <details className="panel production-info detail-disclosure">
            <summary>
              <h3>Timeline</h3>
              <ChevronDown size={16} />
            </summary>
            <dl>
              <dt>Created</dt>
              <dd>{date(p.createdAt)}</dd>
              <dt>Claimed</dt>
              <dd>{date(p.claimedAt)}</dd>
              <dt>Last updated</dt>
              <dd>{date(p.updatedAt)}</dd>
              <dt>Submitted</dt>
              <dd>{date(p.submittedAt)}</dd>
              {p.approvedAt && (
                <>
                  <dt>Approved</dt>
                  <dd>{date(p.approvedAt)}</dd>
                </>
              )}
            </dl>
          </details>
          <details className="panel checklist-panel detail-disclosure">
            <summary>
              <h3>Production checklist</h3>
              <span className="muted">
                {p.checklist.filter(Boolean).length}/10
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className="progress-track">
              <span style={{ width: `${percent}%` }} />
            </div>
            {checklistLabels.map((label, i) => (
              <label
                className={`checklist-item ${p.checklist[i] ? "checked" : ""}`}
                key={label}
              >
                <input
                  type="checkbox"
                  checked={p.checklist[i]}
                  disabled={!editable || busy}
                  onChange={() =>
                    run({
                      type: "save",
                      checklist: p.checklist.map((v, j) => (j === i ? !v : v)),
                    })
                  }
                />
                <span className="custom-check">
                  {p.checklist[i] && <Check size={12} />}
                </span>
                {label}
              </label>
            ))}
            {editable && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  run({ type: "save", checklist: Array(10).fill(true) })
                }
              >
                <CheckCheck size={15} />
                Mark all complete
              </button>
            )}
          </details>
          <div className="task-workflow-actions">
            {role === "Admin / Manager" && p.status === "New" && (
              <button
                className="button primary full-width"
                disabled={busy}
                onClick={() => run({ type: "status", status: "Available" })}
              >
                Make available
                <ArrowRight size={18} />
              </button>
            )}
            {p.status === "Available" && role !== "Reviewer" && (
              <button
                className="button primary full-width"
                disabled={busy}
                onClick={() => run({ type: "claim" })}
              >
                Claim Task
                <ArrowRight size={18} />
              </button>
            )}
            {owner && ["In Progress", "On Hold"].includes(p.status) && (
              <button
                className="text-button"
                onClick={() =>
                  run({
                    type: "status",
                    status: p.status === "On Hold" ? "In Progress" : "On Hold",
                  })
                }
              >
                <Clock size={14} />
                {p.status === "On Hold" ? "Resume production" : "Place on hold"}
              </button>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {editable && (
            <div className="submit-panel">
              <button
                className="button primary full-width"
                disabled={busy}
                onClick={() => run({ type: "submit" })}
              >
                <Send size={16} />
                {busy
                  ? "Submitting…"
                  : p.status === "Corrections Required"
                    ? "Resubmit for review"
                    : "Submit for review"}
              </button>
              <p>Complete the checklist and save your model URL first.</p>
            </div>
          )}
          {reviewer &&
            ["In Review", "Submitted", "Approved"].includes(p.status) && (
              <section className="panel review-actions">
                <h3>Ready for your review</h3>
                <p>
                  Compare the model with its reference and check the production
                  checklist.
                </p>
                <button
                  className="button primary full-width"
                  disabled={busy}
                  onClick={() => run({ type: "approve" })}
                >
                  <Check size={16} />
                  Approve & complete
                </button>
                <button
                  className="button secondary full-width"
                  onClick={() => setCorrection(true)}
                  disabled={p.status === "Approved"}
                >
                  <MessageSquare size={15} />
                  Request corrections
                </button>
              </section>
            )}

          <details className="panel activity-panel detail-disclosure">
            <summary>
              <h3>Activity</h3>
              <span className="muted">{p.activity.length}</span>
              <ChevronDown size={16} />
            </summary>
            {p.activity.map((a, i) => (
              <div className="activity-item" key={`${a.at}-${i}`}>
                <span className="activity-dot" />
                <div>
                  {a.text}
                  <small>
                    {new Date(a.at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </div>
            ))}
          </details>
        </aside>
      </div>
      {correction && (
        <Modal
          title="Request corrections"
          subtitle="Give the artist clear, actionable feedback."
          onClose={() => setCorrection(false)}
        >
          <div className="modal-body field">
            <label htmlFor="correction-comment">
              Review comment <span className="required">*</span>
            </label>
            <textarea
              id="correction-comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="For example: Refine cushion thickness and improve the fabric texture."
            />
            {error && <p className="error-banner">{error}</p>}
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setCorrection(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={!comment.trim() || busy}
              onClick={() => run({ type: "correct", comment })}
            >
              Send feedback
              <Send size={15} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
