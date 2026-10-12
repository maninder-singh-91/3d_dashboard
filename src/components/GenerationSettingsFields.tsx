import {
  modelTypes,
  textureSizes,
  polyCounts,
  modelCredits,
  textureCredits,
  polyCountCredits,
  type ModelGenerationSettings,
} from "../lib/modelGenerationSettings";

export default function GenerationSettingsFields({
  value,
  onChange,
}: {
  value: ModelGenerationSettings;
  onChange: (value: ModelGenerationSettings) => void;
}) {
  return (
    <>
      <label className="generation-field generation-prompt">
        <span>Prompt (optional)</span>
        <textarea
          rows={4}
          placeholder="Add custom specifications if needed…"
          value={value.prompt}
          onChange={(event) =>
            onChange({ ...value, prompt: event.target.value })
          }
        />
        <small>A predefined prompt is used by default. Custom specifications are added to it.</small>
      </label>
      <div className="generation-field">
        <span>Model Type</span>
        <div
          className="generation-model-options"
          role="group"
          aria-label="Model Type"
        >
          {modelTypes.map((modelType) => (
            <button
              key={modelType}
              type="button"
              aria-pressed={value.modelType === modelType}
              onClick={() => onChange({ ...value, modelType })}
            >
              {modelType} <small>({modelCredits[modelType]} credits)</small>
            </button>
          ))}
        </div>
      </div>
      <div className="generation-mesh-option">
        <span>Texture</span>
        <button type="button" role="switch" aria-label="Texture" aria-checked={value.textureEnabled}
          className="generation-mesh-toggle" onClick={() => onChange({ ...value, textureEnabled: !value.textureEnabled })}><span /></button>
      </div>
      {value.textureEnabled && <div className="generation-field">
        <span>Texture Size</span>
        <div
          className="generation-model-options generation-texture-options"
          role="group"
          aria-label="Texture Size"
        >
          {textureSizes.map((textureSize) => (
            <button
              key={textureSize}
              type="button"
              aria-pressed={value.textureSize === textureSize}
              onClick={() => onChange({ ...value, textureSize })}
            >
              {textureSize} <small>(+{textureCredits[textureSize]})</small>
            </button>
          ))}
        </div>
      </div>}
      <div className="generation-mesh-option">
        <span>Mesh Optimisation</span>
        <button
          type="button"
          role="switch"
          aria-label="Mesh Optimisation"
          aria-checked={value.meshOptimisation}
          className="generation-mesh-toggle"
          onClick={() =>
            onChange({ ...value, meshOptimisation: !value.meshOptimisation })
          }
        >
          <span />
        </button>
      </div>
      {value.meshOptimisation && <div className="generation-field">
        <span>Poly count</span>
        <div className="generation-model-options" role="group" aria-label="Poly count">
          {polyCounts.map((polyCount) => <button type="button" key={polyCount}
            aria-pressed={value.polyCount === polyCount} onClick={() => onChange({ ...value, polyCount })}>{polyCount}<small>(+{polyCountCredits[polyCount]})</small></button>)}
        </div>
      </div>}
    </>
  );
}
