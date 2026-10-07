import type { ButtonHTMLAttributes, ReactNode, SVGProps } from "react";

/** Authentic logo files from the user-supplied GlamAR reference site. */
export function GlamARLogo() {
  return (
    <>
      <img
        className="glamar-symbol"
        src="/brand/fynd-glamar-icon.svg"
        alt=""
        aria-hidden="true"
        width="34"
        height="34"
      />
      <span className="glamar-lockup">
        <img
          className="glamar-wordmark"
          src="/brand/fynd-glamar-wordmark.svg"
          alt="Fynd GlamAR"
          width="396"
          height="66"
        />
        <small>3D Production Console</small>
      </span>
    </>
  );
}

/** Matches the custom room-scan glyph in the reference's “View in My Space” button. */
export function ModelPreviewIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      {...props}
      className={`glamar-model-icon ${props.className || ""}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M24 3h3a2 2 0 0 1 2 2v3M29 24v3a2 2 0 0 1-2 2h-3M8 29H5a2 2 0 0 1-2-2v-3" />
      <path d="m16 7 9 5v10l-9 5-9-5V12l9-5Zm-9 5 9 5 9-5m-9 5v10" />
    </svg>
  );
}

/** Reference CTA layout: optional leading icon, centered label, trailing arrow. */
export function BrandButton({
  leadingIcon,
  trailingIcon,
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      {...props}
      className={`button ${variant} glamar-action ${className}`}
    >
      {leadingIcon && (
        <span className="button-leading" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span className="button-label">{children}</span>
      {trailingIcon && (
        <span className="button-trailing" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
