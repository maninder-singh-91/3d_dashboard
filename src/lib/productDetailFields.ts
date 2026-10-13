import type { ProductSpecifications } from "./types";

export const productInformationFields = [
  ["name", "Product name"],
  ["brand", "Brand name"],
  ["category", "Category"],
  ["productUrl", "Product URL"],
] as const;

export const specificationFields: {
  key: Exclude<keyof ProductSpecifications, "placement">;
  label: string;
  placeholder: string;
  numeric?: boolean;
  choices?: string[];
}[] = [
  {
    key: "length",
    label: "Length",
    placeholder: "Enter length",
    numeric: true,
  },
  { key: "width", label: "Width", placeholder: "Enter width", numeric: true },
  {
    key: "height",
    label: "Height",
    placeholder: "Enter height",
    numeric: true,
  },
  {
    key: "unit",
    label: "Dimension unit",
    placeholder: "Select unit",
    choices: ["cm", "mm", "m", "in", "ft"],
  },
];
