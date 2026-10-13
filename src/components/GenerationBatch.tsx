import ImportProductsMenu from "./ImportProductsMenu";
import { memo, useState } from "react";
import { ArrowLeft, Clock, LoaderCircle, CircleCheck, TriangleAlert, X, List, Columns3 } from "lucide-react";
import type { Product } from "../lib/types";
import {
  generationDisplayStatus,
  generationDisplayProgress,
  type GenerationResult,
} from "../lib/generationSelection";
import { ProductImage, SearchField } from "./UI";
import "../generation-selection.css";

export function GenerationBatchHeader({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (source: "catalog" | "manual") => void;
}) {
  return (
    <div className="generation-batch-heading generation-reference-header">
      <div className="generation-header-identity">
        <button className="generation-header-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1>3D Generation</h1>
      </div>
      <div className="generation-header-actions">
      <ImportProductsMenu onBulk={() => onSelect("catalog")} onSingle={() => onSelect("manual")} />
      </div>
    </div>
  );
}
const GenerationProductCard = memo(function GenerationProductCard({
  product,
  result,
  index,
  onOpen,
  onCancel,
}: {
  product: Product;
  result?: GenerationResult;
  index: number;
  onOpen: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const status = generationDisplayStatus(result, index);
  const statusLabel = status === "Ready" || status === "Completed" ? "Done" : status === "In progress" ? "In Progress" : status;
  const progress = generationDisplayProgress(result, index);
  return (
    <div className={`generation-card-wrapper${status === "In Queue" ? " queued-card" : ""}`}>
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
          {statusLabel}
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
      </div>
    </button>
    {status === "In Queue" && onCancel && <button type="button" className="generation-card-cancel"
      aria-label={`Cancel generation for ${product.name}, SKU ${product.sku}`} title="Cancel generation"
      onClick={() => onCancel(product.id)}><X size={14} /></button>}
    </div>
  );
});
export default function GenerationBatch({
  products,
  results,
  onOpen,
  onCancel,
}: {
  products: Product[];
  results: Record<string, GenerationResult>;
  onOpen: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "board">("board");
  const cards = products.map((product, index) => ({ product, index, status: generationDisplayStatus(results[product.id], index) }));
  const groups = [
    { name: "In Queue", key: "queued", icon: Clock, description: "Waiting to start", empty: "No products waiting", cards: cards.filter(card => card.status === "In Queue") },
    { name: "In Progress", key: "running", icon: LoaderCircle, description: "Models are being generated", empty: "No generation in progress", cards: cards.filter(card => card.status === "In progress") },
    { name: "Done", key: "done", icon: CircleCheck, description: "Ready to review and sync", empty: "No completed models yet", cards: cards.filter(card => card.status === "Ready" || card.status === "Completed") },
    { name: "Needs attention", key: "attention", icon: TriangleAlert, description: "Review these generations", empty: "No issues", cards: cards.filter(card => card.status === "Failed" || card.status === "Needs attention") },
  ];
  const term = query.trim().toLowerCase();
  const visibleGroups = groups.filter(group => (group.key !== "attention" || group.cards.length));
  return <div className="generation-dashboard">
    <div className="generation-dashboard-toolbar">
      <div><h2>Generation overview</h2><p>Follow each product from queue to finished model.</p></div>
      <div className="generation-overview-actions">
        <SearchField value={query} onChange={setQuery} placeholder="Search products or SKU" />
        <div className="generation-view-toggle" role="group" aria-label="Generation view">
          <button type="button" aria-label="List view" title="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={20} /></button>
          <button type="button" aria-label="Board view" title="Board view" aria-pressed={view === "board"} onClick={() => setView("board")}><Columns3 size={20} /></button>
        </div>
      </div>
    </div>
    <div className={`generation-status-groups view-${view}`}>
      {visibleGroups.map(group => {
        const visible = group.cards.filter(({ product }) => `${product.name} ${product.sku}`.toLowerCase().includes(term));
        return <section className={`generation-status-group state-${group.key}`} key={group.name} aria-label={`${group.name} generations`}>
          <header className="generation-lane-heading"><span className="generation-lane-icon"><group.icon size={18} /></span>
            <div><h2>{group.name}<span>{visible.length}</span></h2><p>{group.description}</p></div>
          </header>
          {visible.length ? <div className="generation-product-grid">
            {visible.map(({ product, index }) => <GenerationProductCard key={product.id} product={product} result={results[product.id]} index={index} onOpen={onOpen} onCancel={onCancel} />)}
          </div> : <div className="generation-group-empty"><group.icon size={24} /><strong>{term ? "No matching products" : group.empty}</strong>
            <span>{term ? "Try another product name or SKU." : "Products will appear here when their status changes."}</span></div>}
        </section>;
      })}
    </div>
    {!products.every(product => results[product.id]) && <p className="generation-dashboard-note">Demo statuses · Progress shown is illustrative</p>}
  </div>;
}
