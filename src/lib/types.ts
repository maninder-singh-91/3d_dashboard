export const statuses = [
  "New",
  "Available",
  "Claimed",
  "In Progress",
  "Submitted",
  "In Review",
  "Corrections Required",
  "Approved",
  "Completed",
  "On Hold",
] as const;
export type Status = (typeof statuses)[number];
export type ConsoleStatus = "Published" | "Draft";
export type Role = "Admin / Manager" | "3D Artist" | "Reviewer";
export interface ProductSpecifications {
  barcode: string;
  storefront: string;
  length: string;
  width: string;
  height: string;
  unit: string;
  color: string;
  weight: string;
  usageArea: string;
  roomType: string;
  material: string;
  price: string;
  currency: string;
}
export type ProductDetails = Pick<
  Product,
  "name" | "brand" | "category" | "productUrl"
> & { specifications: ProductSpecifications };
export interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  role: Role;
  email: string;
  color: string;
  status: "Online" | "Away";
}
export interface Product {
  singleProductDraft?: boolean;
  discardedSingleProductDraft?: boolean;
  source?: "manual-generation";
  hiddenReferenceUrls?: string[];
  consoleStatus?: ConsoleStatus;
  isDemo?: boolean;
  holdReason?: string;
  revisionComment?: string;
  reviewCycleCount?: number;
  revisionAcknowledgedCycles?: number[];
  revisionCommentsClosed?: boolean;
  revisionHistory?: { cycle: number; comment: string }[];
  revisionCycleArchives?: { at: string; cycle: number; comment: string; history: { cycle: number; comment: string }[] }[];
  id: string;
  category: string;
  sku: string;
  name: string;
  imageUrl: string;
  brand: string;
  productUrl: string;
  status: Status;
  assigneeId: string | null;
  batchId: string;
  reviewStatus: string;
  reviewComment: string;
  modelUrl: string;
  specifications?: ProductSpecifications;
  createdAt: string;
  claimedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  updatedAt: string;
  priority: "Normal" | "High";
  difficulty: string;
  checklist: boolean[];
  activity: { text: string; at: string }[];
}
export interface Batch {
  id: string;
  name: string;
  createdAt: string;
}
export interface Database {
  version: 1;
  products: Product[];
  batches: Batch[];
}
export const checklistLabels = [
  "Reference collected",
  "Dimensions verified",
  "Geometry completed",
  "Materials completed",
  "Textures completed",
  "Lighting checked",
  "Scale verified",
  "Optimization completed",
  "Model exported",
  "Final preview checked",
];
