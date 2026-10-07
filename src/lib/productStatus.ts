import type { Status } from "./types";

export const productStatusOptions = [
  { value: "Available", label: "To do" },
  { value: "In Progress", label: "In Progress" },
  { value: "In Review", label: "Review" },
  { value: "On Hold", label: "Hold" },
  { value: "Completed", label: "Done" },
] as const;

// Preserve workflow details while presenting consistent product statuses.
const labels: Record<Status, string> = {
  New: "To do",
  Available: "To do",
  Claimed: "In Progress",
  "In Progress": "In Progress",
  "Corrections Required": "In Progress",
  Submitted: "Review",
  "In Review": "Review",
  "On Hold": "Hold",
  Approved: "Done",
  Completed: "Done",
};

export function productStatusLabel(status: string): string {
  return labels[status as Status] ?? status;
}

export function productStatusClass(status: string): string {
  const label = productStatusLabel(status);
  return (
    productStatusOptions.find((option) => option.label === label)?.value ??
    status
  );
}
