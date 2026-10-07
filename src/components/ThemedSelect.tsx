import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function ThemedSelect({
  label,
  value,
  options,
  disabled,
  onChange,
  renderLabel,
  renderTrigger,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
  renderLabel?: (value: string, label: string) => ReactNode;
  renderTrigger?: (
    value: string,
    label: string,
    indicator: ReactNode,
  ) => ReactNode;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  function show() {
    setActive(selected);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || disabled) return;
    setOpen(false);
    trigger.current?.focus();
    if (option.value !== value) onChange(option.value);
  }
  return (
    <div className="themed-select" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="themed-select-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={(event) => {
          if (!root.current?.contains(event.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            setActive((index) =>
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        options.length - 1,
                        index + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
            );
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) choose(active);
            else show();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          } else if (event.key === "Tab") setOpen(false);
          else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            const text =
              (Date.now() - search.current.at < 700
                ? search.current.text
                : "") + event.key.toLowerCase();
            search.current = { text, at: Date.now() };
            const match = options.findIndex((option) =>
              option.label.toLowerCase().startsWith(text),
            );
            if (match >= 0) {
              event.preventDefault();
              setActive(match);
              setOpen(true);
            }
          }
        }}
      >
        {renderTrigger ? (
          renderTrigger(
            options[selected]?.value,
            options[selected]?.label,
            <ChevronDown size={16} aria-hidden="true" />,
          )
        ) : (
          <>
            <span>
              {renderLabel
                ? renderLabel(
                    options[selected]?.value,
                    options[selected]?.label,
                  )
                : options[selected]?.label}
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <ul
          id={id}
          role="listbox"
          aria-label={label}
          className="themed-select-menu"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={index === active ? "active" : ""}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>
                {renderLabel
                  ? renderLabel(option.value, option.label)
                  : option.label}
              </span>
              {option.value === value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
