import type { ReactNode } from "react";
import { useModelUrl } from "../lib/useModelUrl";
export default function ModelFileLink({ source, filename, children, className, title }: {
  source: string; filename: string; children: ReactNode; className?: string; title: string;
}) {
  const { url, error } = useModelUrl(source);
  return url ? <a href={url} download={filename} target="_blank" rel="noreferrer" className={className} title={title} aria-label={title}>{children}</a>
    : <span className={className} aria-disabled="true" title={error || "Loading model…"}>{children}</span>;
}
