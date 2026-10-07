import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const options = [
  "Recently added",
  "Recently assigned",
  "Oldest",
  "Priority",
  "Status",
  "Category",
];

export default function SortMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = () => {
    const rect = trigger.current!.getBoundingClientRect();
    const height = 252;
    setPosition({
      left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)),
      top:
        rect.bottom + height + 8 > window.innerHeight
          ? Math.max(8, rect.top - height - 8)
          : rect.bottom + 8,
    });
  };
  const close = () => {
    setPosition(null);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!position) return;
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setPosition(null);
    };
    const reposition = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) setPosition(null);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [position]);

  return (
    <div className="sort-control">
      <button
        ref={trigger}
        type="button"
        className="sort-select"
        aria-label={`Sort products: ${value}`}
        aria-haspopup="menu"
        aria-expanded={!!position}
        aria-controls={position ? id : undefined}
        onClick={() => (position ? close() : open())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            open();
          }
        }}
      >
        {value}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menu}
            id={id}
            className="sort-menu"
            role="menu"
            aria-label="Sort products"
            style={position}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setPosition(null);
            }}
            onKeyDown={(event) => {
              const items = [
                ...menu.current!.querySelectorAll<HTMLButtonElement>("button"),
              ];
              const index = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              let next = index;
              if (event.key === "ArrowDown") next = (index + 1) % items.length;
              else if (event.key === "ArrowUp")
                next = (index - 1 + items.length) % items.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = items.length - 1;
              else if (event.key === "Escape") {
                event.preventDefault();
                close();
                return;
              } else if (event.key === "Tab") {
                event.preventDefault();
                close();
                return;
              } else return;
              event.preventDefault();
              items[next].focus();
            }}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option}
                role="menuitemradio"
                aria-checked={value === option}
                tabIndex={-1}
                onClick={() => {
                  onChange(option);
                  close();
                }}
              >
                <span>{option}</span>
                {value === option && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
