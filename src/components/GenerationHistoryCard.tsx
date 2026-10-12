import { Box, Download } from "lucide-react";
import { useModelUrl } from "../lib/useModelUrl";
import { generationSettingsSummary, type GenerationHistoryEntry } from "../lib/generationHistory";
export default function GenerationHistoryCard({ entry, selected, checked, onCheck, onSelect }: { entry: GenerationHistoryEntry; selected: boolean; checked: boolean; onCheck: () => void; onSelect: () => void }) {
  const { url } = useModelUrl(entry.modelUrl);
  return <div className={`generation-history-card${selected ? " selected" : ""}`}>
    <input type="checkbox" checked={checked} onChange={onCheck} aria-label={`Select Generation ${entry.number} for deletion`} />
    <button type="button" className="generation-history-select" aria-pressed={selected} aria-label={`Select Generation ${entry.number}`} onClick={onSelect}>
      {entry.thumbnail ? <img className="generation-history-thumbnail" src={entry.thumbnail} alt="" /> : <span className="generation-history-placeholder"><Box size={24} /></span>}
      <span className="generation-history-copy">
        <strong>Generation {entry.number}</strong>
        <small title={generationSettingsSummary(entry.settings)}>{generationSettingsSummary(entry.settings)}</small>
        {entry.preview && <small>Preview</small>}
      </span>
    </button>
    {url && <a className="icon-button" href={url} download={`generation-${entry.number}.glb`} aria-label={`Download Generation ${entry.number}`} title={`Download Generation ${entry.number}`}><Download size={18} /></a>}
  </div>;
}
