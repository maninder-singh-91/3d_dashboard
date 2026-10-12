import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

export default function ImportProductsMenu({ onSingle, onBulk, disabled = false }: {
  disabled?: boolean;
  onSingle: () => void; onBulk: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div className="import-products-menu" ref={root}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="button primary" aria-haspopup="menu" disabled={disabled}
      aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(!open)}
      onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}>
      <Plus size={18} /> Import Catalog <ChevronDown size={16} />
    </button>
    {open && <div id={id} role="menu" aria-label="Import Catalog" className="import-products-options"
      onKeyDown={(event) => {
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : (current + 1) % 2;
          items[next].focus();
        } else if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      }}>
      <button role="menuitem" type="button" onClick={() => { setOpen(false); onBulk(); }}>Add Bulk Product</button>
      <button role="menuitem" type="button" onClick={() => { setOpen(false); onSingle(); }}>Add Single Product</button>
    </div>}
  </div>;
}
