import { memo } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import type { Product } from "../lib/types";
import {
  MAX_GENERATION_PRODUCTS,
  type GenerationResult,
} from "../lib/generationSelection";
import { ProductImage } from "./UI";
import "../generation-selection.css";

const demoStates = [
  { status: "In Queue", progress: undefined },
  { status: "In progress", progress: 45 },
  { status: "Ready", progress: undefined },
] as const;

export function GenerationBatchHeader({
  count,
  onBack,
  onSelect,
}: {
  count: number;
  onBack: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="generation-batch-heading generation-reference-header">
      <div className="generation-header-identity">
        <button className="generation-header-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1>3D Generation</h1>
      </div>
      <button className="button secondary" onClick={onSelect}>
        <Plus size={15} /> Add Products · {count}/{MAX_GENERATION_PRODUCTS}
      </button>
    </div>
  );
}
const GenerationProductCard = memo(function GenerationProductCard({
  product,
  result,
  index,
  onOpen,
}: {
  product: Product;
  result?: GenerationResult;
  index: number;
  onOpen: (id: string) => void;
}) {
  const demo = demoStates[index % demoStates.length];
  const status = result
    ? result.status === "Generating"
      ? "In progress"
      : result.status
    : demo.status;
  const progress = result ? undefined : demo.progress;
  return (
    <button
      className="panel generation-product-card"
      onClick={() => onOpen(product.id)}
      aria-label={`Open Generation for ${product.name}, SKU ${product.sku}`}
    >
      <ProductImage product={product} />
      <div className="generation-card-body">
        <strong>{product.name}</strong>
        <small>SKU {product.sku}</small>
        <span
          className={`generation-job-status generation-job-${status.toLowerCase().replaceAll(" ", "-")}`}
        >
          <i />
          {status}
        </span>
        {status === "In progress" && (
          <span className="generation-card-progress">
            <span>
              Generating{progress !== undefined && <span>{progress}%</span>}
            </span>
            <progress
              aria-label={`Generation progress for ${product.name}`}
              max={100}
              value={progress}
            />
          </span>
        )}
        {result?.message && <p>{result.message}</p>}
        <span className="generation-card-action">
          Open Generation <ArrowRight size={16} />
        </span>
      </div>
    </button>
  );
});
export default function GenerationBatch({
  products,
  results,
  onOpen,
}: {
  products: Product[];
  results: Record<string, GenerationResult>;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      {!products.every((product) => results[product.id]) && (
        <p className="generation-status-demo">
          Demo statuses · Progress shown is illustrative
        </p>
      )}
      <div className="generation-product-grid" aria-label="Generation products">
        {products.map((product, index) => (
          <GenerationProductCard
            key={product.id}
            product={product}
            result={results[product.id]}
            index={index}
            onOpen={onOpen}
          />
        ))}
      </div>
    </>
  );
}
