import {
  modelTypes,
  textureSizes,
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
        <span>Prompt</span>
        <textarea
          rows={4}
          placeholder="Describe how you want to generate or refine the 3D model…"
          value={value.prompt}
          onChange={(event) =>
            onChange({ ...value, prompt: event.target.value })
          }
        />
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
              {modelType}
            </button>
          ))}
        </div>
      </div>
      <div className="generation-field">
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
              {textureSize}
            </button>
          ))}
        </div>
      </div>
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
    </>
  );
}
