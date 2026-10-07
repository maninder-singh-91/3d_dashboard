import type { Database, Product, Status, TeamMember } from "./types";
import records from "./products.json";
export const team: TeamMember[] = [
  {
    id: "maninder",
    name: "Maninder Singh",
    initials: "MS",
    role: "Admin / Manager",
    email: "maninder@modello.demo",
    color: "lavender",
    status: "Online",
  },
  {
    id: "adnan",
    name: "Adnan Shaikh",
    initials: "AS",
    role: "3D Artist",
    email: "adnan@modello.demo",
    color: "peach",
    status: "Online",
  },
  {
    id: "supriya",
    name: "Supriya",
    initials: "SU",
    role: "3D Artist",
    email: "supriya@modello.demo",
    color: "sage",
    status: "Online",
  },
  {
    id: "kritika",
    name: "Kritika",
    initials: "KR",
    role: "3D Artist",
    email: "kritika@modello.demo",
    color: "blue",
    status: "Away",
  },
  {
    id: "riya",
    name: "Riya Sharma",
    initials: "RS",
    role: "Reviewer",
    email: "riya@modello.demo",
    color: "pink",
    status: "Online",
  },
];
export const demoModel = "/models/studio-chair.glb";
const distribution: Status[] = [
  "Available",
  "In Progress",
  "In Review",
  "Completed",
  "Corrections Required",
  "Available",
  "In Progress",
  "Completed",
  "Available",
  "In Review",
  "Completed",
  "In Progress",
  "Available",
  "Completed",
  "New",
  "In Progress",
  "In Review",
  "Available",
  "Corrections Required",
  "Completed",
  "Available",
  "Completed",
  "In Progress",
  "Completed",
  "Submitted",
  "Available",
  "On Hold",
  "Completed",
  "In Review",
  "Available",
  "Completed",
  "Approved",
  "Available",
  "Completed",
  "In Progress",
  "Completed",
];
export const seed: Database = {
  version: 1,
  batches: [
    { id: "024", name: "Batch #024", createdAt: "2026-09-22T09:00:00Z" },
    { id: "023", name: "Batch #023", createdAt: "2026-09-15T09:00:00Z" },
    { id: "022", name: "Batch #022", createdAt: "2026-09-08T09:00:00Z" },
  ],
  products: records.map((r, i) => {
    const status = distribution[i % distribution.length];
    const assigned = !["Available", "New"].includes(status);
    const submitted = [
      "In Review",
      "Submitted",
      "Approved",
      "Completed",
      "Corrections Required",
    ].includes(status);
    const at = new Date(
      Date.parse("2026-09-28T09:00:00Z") - i * 43200000,
    ).toISOString();
    return {
      ...r,
      id: `product-${i}`,
      status,
      assigneeId: assigned
        ? ["maninder", "adnan", "supriya", "kritika"][i % 4]
        : null,
      batchId: i < 16 ? "024" : i < 28 ? "023" : "022",
      reviewStatus:
        status === "Completed" || status === "Approved"
          ? "Approved"
          : status === "Corrections Required"
            ? "Changes requested"
            : submitted
              ? "Pending review"
              : "Not submitted",
      reviewComment:
        status === "Corrections Required"
          ? "Please refine the cushion thickness and improve the fabric texture before resubmitting."
          : "",
      modelUrl: submitted ? demoModel : "",
      createdAt: at,
      updatedAt: at,
      claimedAt: assigned ? at : null,
      submittedAt: submitted ? at : null,
      approvedAt: status === "Completed" ? at : null,
      priority: i % 7 === 0 ? "High" : "Normal",
      difficulty: ["Standard", "Simple", "Complex"][i % 3],
      checklist: Array.from(
        { length: 10 },
        (_, j) => submitted || (assigned && j < 4),
      ),
      activity: [
        {
          text:
            status === "Available"
              ? "Product added and ready to claim."
              : `Product moved to ${status.toLowerCase()}.`,
          at,
        },
      ],
    } as Product;
  }),
};
