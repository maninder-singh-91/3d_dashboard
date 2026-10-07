import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Modal } from "./UI";
import GenerationSettingsFields from "./GenerationSettingsFields";
import { CreditSummary } from "./GenerationSelectionModal";
import type { ModelGenerationSettings } from "../lib/modelGenerationSettings";
import "../generation-workspace.css";

export default function GenerationSettingsModal({
  count,
  value,
  onChange,
  onBack,
  onClose,
  onProceed,
}: {
  count: number;
  value: ModelGenerationSettings;
  onChange: (value: ModelGenerationSettings) => void;
  onBack: () => void;
  onClose: () => void;
  onProceed: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <Modal
      title="Generation Settings"
      subtitle={`Apply these settings to ${count} selected ${count === 1 ? "product" : "products"}.`}
      className="generation-batch-settings-modal"
      onClose={onClose}
      headerLeading={
        <button
          type="button"
          className="generation-source-back"
          onClick={onBack}
          aria-label="Back to select products"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      }
    >
      <div className="generation-batch-settings-content generation-model-settings">
        <GenerationSettingsFields value={value} onChange={onChange} />
        {error && (
          <p role="alert" className="generation-upload-error">
            {error}
          </p>
        )}
      </div>
      <CreditSummary count={count} />
      <footer className="generation-selection-footer">
        <span>No credits charged in demo</span>
        <button
          type="button"
          className="button primary"
          disabled={!count}
          onClick={() => {
            try {
              onProceed();
            } catch {
              setError("Settings could not be saved. Please try again.");
            }
          }}
        >
          Proceed <ArrowRight size={16} />
        </button>
      </footer>
    </Modal>
  );
}
