import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "./UI";
import type { TeamMember } from "../lib/types";

export default function ProfileMenu({
  user,
  onChangeOrganisation,
  onLogout,
}: {
  user: TeamMember;
  onChangeOrganisation?: () => void;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="profile-dropdown"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
        if (
          open &&
          ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
        ) {
          event.preventDefault();
          const items = Array.from(
            menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
          );
          const index = items.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? items.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    items.length) %
                  items.length;
          items[next]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="header-profile"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "profile-menu" : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (!open && event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Avatar member={user} />
        <span>
          <strong>{user.name}</strong>
          <small>3D Designer</small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          ref={menu}
          id="profile-menu"
          className="profile-menu"
          role="menu"
          aria-label="Profile"
        >
          <div className="profile-menu-heading">
            GlamAR Production<small>Current organisation</small>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onChangeOrganisation?.();
            }}
          >
            <Building2 size={17} />
            Change organisation
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
