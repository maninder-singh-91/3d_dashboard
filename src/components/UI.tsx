import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Armchair,
  BedDouble,
  Sofa,
  Table2,
  ArrowUpRight,
  Box,
  Check,
  Search,
  X,
} from "lucide-react";
import type { Product, TeamMember } from "../lib/types";
import { productStatusClass, productStatusLabel } from "../lib/productStatus";
export function StatusBadge({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`status status-${productStatusClass(status).toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {productStatusLabel(status)}
      {children}
    </span>
  );
}
export function Avatar({
  member,
  small = false,
}: {
  member?: TeamMember;
  small?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string>();
  return (
    <span
      className={`avatar ${member?.color || ""} ${small ? "small" : ""}`}
      title={member?.name}
    >
      {member?.avatarUrl && member.avatarUrl !== failedImage ? (
        <img src={member.avatarUrl} alt="" onError={() => setFailedImage(member.avatarUrl)}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
      ) : member?.initials || "—"}
    </span>
  );
}
export function ProductImage({
  product,
  className = "",
}: {
  product: Pick<Product, "imageUrl" | "category" | "name">;
  className?: string;
}) {
  const Icon = product.category.toLowerCase().includes("bed")
    ? BedDouble
    : product.category.toLowerCase().includes("sofa")
      ? Sofa
      : product.category.toLowerCase().includes("table")
        ? Table2
        : Armchair;
  return (
    <div className={`product-image ${className}`}>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onLoad={(e) => e.currentTarget.classList.add("image-loaded")}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement?.classList.add("image-failed");
          }}
        />
      ) : null}
      <Icon className="image-placeholder" size={32} />
    </div>
  );
}
export function Empty({
  title = "No products found",
  text = "Try a different search or clear your filters.",
  action,
}: {
  title?: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Box size={28} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  headerLeading,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  headerLeading?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        {headerLeading}
        <div style={headerLeading ? { flex: 1, minWidth: 0 } : undefined}>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search products, SKU, brand…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="icon-button"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}
export function ExternalLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="external-link">
      {children}
      <ArrowUpRight size={13} />
    </a>
  );
}
export function Toast({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <div
      className={`toast ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error ? <X size={17} /> : <Check size={17} />}
      <span>{message}</span>
    </div>
  );
}
