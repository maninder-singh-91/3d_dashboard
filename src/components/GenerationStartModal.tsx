import { ArrowRight, FileSpreadsheet, ImagePlus } from "lucide-react";
import { Modal } from "./UI";
import "../generation-selection.css";

export default function GenerationStartModal({
  onChoose,
  onClose,
}: {
  onChoose: (source: "catalog" | "manual") => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="3D Generation"
      subtitle="Choose how you’d like to add your products."
      className="generation-start-modal"
      onClose={onClose}
    >
      <div className="generation-source-options">
        <button type="button" onClick={() => onChoose("catalog")}>
          <span className="generation-source-icon">
            <FileSpreadsheet size={28} />
          </span>
          <strong>Upload by catalog</strong>
          <span>Choose products from a catalog batch.</span>
          <span className="generation-source-next">
            Select products <ArrowRight size={17} />
          </span>
        </button>
        <button type="button" onClick={() => onChoose("manual")}>
          <span className="generation-source-icon">
            <ImagePlus size={28} />
          </span>
          <strong>Upload manually</strong>
          <span>Add individual products for 3D generation.</span>
          <span className="generation-source-next">
            Get started <ArrowRight size={17} />
          </span>
        </button>
      </div>
    </Modal>
  );
}
