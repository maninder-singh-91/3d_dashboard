import type { Product, ProductDetails, Role } from "./types";
import { productStatusLabel } from "./productStatus";
import { isLocalModel } from "./modelReference";
export type CatalogStatus =
  "Available" | "In Progress" | "In Review" | "On Hold" | "Completed";
export type Action =
  | { type: "revision-comment"; comment: string }
  | { type: "sync-model"; sku: string; modelUrl: string }
  | { type: "remove-reference"; url: string }
  | { type: "remove-model" }
  | { type: "hold-reason"; reason: string }
  | { type: "catalog-status"; status: CatalogStatus }
  | { type: "details"; details: ProductDetails }
  | { type: "claim" }
  | { type: "save"; modelUrl?: string; checklist?: boolean[] }
  | { type: "submit" }
  | { type: "approve" }
  | { type: "correct"; comment: string }
  | { type: "assign"; assigneeId: string | null }
  | { type: "status"; status: "Available" | "On Hold" | "In Progress" };
export function validUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function transition(
  p: Product,
  action: Action,
  userId: string,
  role: Role,
): Product {
  const admin = role === "Admin / Manager",
    owner = p.assigneeId === userId,
    reviewer = admin || role === "Reviewer";
  const now = new Date().toISOString();
  let next = { ...p, updatedAt: now };
  let event = "Production details updated";
  switch (action.type) {
    case "revision-comment": {
      if (productStatusLabel(p.status) === "To do")
        throw Error("Revision comments are available after the To do stage.");
      if (!reviewer && !(role === "3D Artist" && owner))
        throw Error("Only a manager, reviewer, or assigned artist can edit revision comments.");
      const comment = action.comment.trim();
      if (comment.length > 2000)
        throw Error("Keep the revision comment within 2,000 characters.");
      next.revisionComment = comment;
      event = comment ? `Revision comment updated: ${comment}` : "Revision comment cleared.";
      break;
    }
    case "sync-model": {
      if (!admin && !(role === "3D Artist" && (owner || !p.assigneeId)))
        throw Error("Only a manager or the responsible artist can sync this product's model.");
      if (action.sku !== p.sku) throw Error("The product SKU has changed. Reopen the product before syncing.");
      if (!validUrl(action.modelUrl) && action.modelUrl !== "/models/studio-chair.glb" && !isLocalModel(action.modelUrl))
        throw Error("Choose a model that can be saved to the listing.");
      next.modelUrl = action.modelUrl;
      event = action.modelUrl === "/models/studio-chair.glb"
        ? "Sample 3D model synced from generation workspace."
        : "3D model synced from generation workspace.";
      break;
    }
    case "remove-reference": {
      const unassignedTodo =
        !p.assigneeId && productStatusLabel(p.status) === "To do";
      if (!admin && !(role === "3D Artist" && (owner || unassignedTodo)))
        throw Error("You cannot remove images from this product.");
      if (!action.url.trim()) throw Error("Choose an image to remove.");
      next.hiddenReferenceUrls = [
        ...new Set([...(p.hiddenReferenceUrls || []), action.url]),
      ];
      event = "Product reference image removed.";
      break;
    }
    case "remove-model": {
      if (!reviewer && !(role === "3D Artist" && owner))
        throw Error(
          "Only a manager, reviewer, or assigned artist can remove this model.",
        );
      if (productStatusLabel(p.status) !== "Review")
        throw Error("Models can only be removed from tasks in review.");
      next.modelUrl = "";
      event = "3D model removed from review.";
      break;
    }
    case "hold-reason": {
      if (!admin && !(role === "3D Artist" && owner))
        throw Error(
          "Only a manager or the assigned artist can edit the hold reason.",
        );
      if (productStatusLabel(p.status) !== "Hold")
        throw Error(
          "A hold reason can only be saved while the task is on hold.",
        );
      const reason = action.reason.trim();
      if (reason.length > 2000)
        throw Error("Keep the hold reason within 2,000 characters.");
      next.holdReason = reason;
      event = reason
        ? `Hold reason updated: ${reason}`
        : "Hold reason removed.";
      break;
    }
    case "catalog-status": {
      const unassignedTodo =
        !p.assigneeId && productStatusLabel(p.status) === "To do";
      if (!admin && (role !== "3D Artist" || (!owner && !unassignedTodo)))
        throw Error("You cannot update this task.");
      if (action.status === "Available" && !admin)
        throw Error("Only a manager can release a task.");
      next = {
        ...next,
        status: action.status,
        assigneeId:
          action.status === "Available" ? null : p.assigneeId || userId,
        claimedAt: action.status === "Available" ? null : p.claimedAt || now,
        approvedAt: action.status === "Completed" ? now : null,
        submittedAt: action.status === "In Review" ? now : null,
        reviewStatus:
          action.status === "Completed"
            ? "Approved"
            : action.status === "In Review"
              ? "Pending review"
              : "Not submitted",
        reviewComment: "",
      };
      event = `Status changed to ${productStatusLabel(action.status)}.`;
      break;
    }
    case "details": {
      if (
        !admin &&
        (role !== "3D Artist" ||
          !owner ||
          !["In Progress", "Corrections Required", "Claimed"].includes(
            p.status,
          ))
      )
        throw Error(
          "Only a manager or the assigned artist can edit product details.",
        );
      const d = action.details;
      if (![d.name, d.brand, d.category].every((value) => value.trim()))
        throw Error("Product name, brand and category are required.");
      if (d.productUrl && !validUrl(d.productUrl))
        throw Error("Enter a valid HTTP or HTTPS product URL.");
      for (const key of [
        "length",
        "width",
        "height",
        "weight",
        "price",
      ] as const) {
        const value = d.specifications[key].trim();
        if (value && (!Number.isFinite(Number(value)) || Number(value) < 0))
          throw Error(
            "Dimensions, weight and price must be valid positive numbers or zero.",
          );
      }
      next = {
        ...next,
        name: d.name.trim(),
        brand: d.brand.trim(),
        category: d.category.trim(),
        productUrl: d.productUrl.trim(),
        specifications: { ...d.specifications },
      };
      event = "Product details and specifications updated.";
      break;
    }
    case "claim":
      if (role === "Reviewer" || p.status !== "Available" || p.assigneeId)
        throw Error(
          "This task has already been claimed or is no longer available.",
        );
      next = {
        ...next,
        status: "In Progress",
        assigneeId: userId,
        claimedAt: now,
      };
      event = "Task claimed. Production started.";
      break;
    case "save":
      if (
        role === "Reviewer" ||
        (!owner && !admin) ||
        !["In Progress", "Corrections Required", "Claimed"].includes(p.status)
      )
        throw Error("Only the assigned artist can edit an active task.");
      if (action.modelUrl !== undefined) {
        if (
          action.modelUrl &&
          !validUrl(action.modelUrl) &&
          action.modelUrl !== "/models/studio-chair.glb" &&
          !(isLocalModel(action.modelUrl) && action.modelUrl === p.modelUrl)
        )
          throw Error("Enter a valid HTTP or HTTPS model URL.");
        next.modelUrl = action.modelUrl;
      }
      if (action.checklist) {
        if (action.checklist.length !== 10)
          throw Error("The production checklist must contain all 10 steps.");
        next.checklist = action.checklist;
      }
      break;
    case "submit":
      if (
        role === "Reviewer" ||
        (!owner && !admin) ||
        !["In Progress", "Corrections Required", "Claimed"].includes(p.status)
      )
        throw Error("This task is not ready for submission.");
      if (!validUrl(p.modelUrl) && p.modelUrl !== "/models/studio-chair.glb" && !isLocalModel(p.modelUrl))
        throw Error("Add a valid GLB URL before submitting.");
      if (!p.checklist.every(Boolean))
        throw Error("Complete the production checklist before submitting.");
      next = {
        ...next,
        status: "In Review",
        reviewStatus: "Pending review",
        submittedAt: now,
      };
      event =
        p.status === "Corrections Required"
          ? "Updated model resubmitted for review."
          : "Model submitted for review.";
      break;
    case "approve":
      if (
        !reviewer ||
        !["In Review", "Submitted", "Approved"].includes(p.status)
      )
        throw Error("Only a reviewer can approve a submitted task.");
      if (!p.modelUrl) throw Error("A model URL is required before approval.");
      next = {
        ...next,
        status: "Completed",
        reviewStatus: "Approved",
        approvedAt: now,
      };
      event = "Model approved. Task completed.";
      break;
    case "correct":
      if (!reviewer || !["In Review", "Submitted"].includes(p.status))
        throw Error("This task is not in review.");
      if (!action.comment.trim())
        throw Error("Add a correction comment for the artist.");
      next = {
        ...next,
        status: "Corrections Required",
        reviewStatus: "Changes requested",
        reviewComment: action.comment.trim(),
      };
      event = `Corrections requested: ${action.comment.trim()}`;
      break;
    case "assign":
      if (!admin) throw Error("Manager access is required.");
      if (
        ["Completed", "In Review", "Submitted", "Approved"].includes(p.status)
      )
        throw Error("Reassign only active or available tasks.");
      next = {
        ...next,
        assigneeId: action.assigneeId,
        status: action.assigneeId ? "In Progress" : "Available",
        claimedAt: action.assigneeId ? now : null,
      };
      event = action.assigneeId
        ? "Task reassigned by manager."
        : "Task returned to available.";
      break;
    case "status":
      if (role === "Reviewer" || (!admin && !owner))
        throw Error("You cannot update this task.");
      if (
        ["Completed", "In Review", "Submitted", "Approved"].includes(p.status)
      )
        throw Error("Use review actions for submitted tasks.");
      if (action.status === "Available" && !admin)
        throw Error("Only a manager can release a task.");
      if (action.status === "In Progress" && !p.assigneeId)
        throw Error("Claim or assign this task first.");
      next = {
        ...next,
        status: action.status,
        ...(action.status === "Available" ? { assigneeId: null } : {}),
      };
      event = `Status changed to ${action.status}.`;
      break;
  }
  if (productStatusLabel(p.status) !== "To do" && productStatusLabel(next.status) === "To do")
    throw Error("A task cannot return to To do after it has moved to another state.");
  return {
    ...next,
    activity: [{ text: event, at: now }, ...p.activity].slice(0, 30),
  };
}
