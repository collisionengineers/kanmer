import type { BoardConfig } from "@kanmer/core";
import type { DocModel } from "../../../shared/ipc.js";
import {
  type Vocabulary,
  splitRequirements,
  validateProfiles,
} from "../lib/profileDraft.js";

export type RequirementMap = Record<string, string[]>;

/** A resolved renderer vocabulary for one ticket's inline custom profile. */
export function vocabularyFromModel(model: DocModel, board: BoardConfig): Vocabulary {
  return {
    docTypes: model.docTypes,
    proofTypes: model.proofTypes,
    environments: board.deployment?.environments ?? [],
    boundaries: model.boundaries,
  };
}

/** Clone the map crossing the component boundary so drafts never mutate items. */
export function cloneRequirementMap(value: RequirementMap | undefined): RequirementMap {
  return Object.fromEntries(
    Object.entries(value ?? {}).map(([boundary, requirements]) => [boundary, [...requirements]]),
  );
}

/** Convert the validated map to the editor's comma-separated fields. */
export function requirementsForEditor(value: RequirementMap | undefined, boundary: string): string {
  return (value?.[boundary] ?? []).join(", ");
}

/** Replace one boundary field, removing empty boundaries from the wire map. */
export function updateRequirementMap(value: RequirementMap, boundary: string, field: string): RequirementMap {
  const next = cloneRequirementMap(value);
  const requirements = splitRequirements(field);
  if (requirements.length === 0) delete next[boundary];
  else next[boundary] = requirements;
  return next;
}

export function requirementErrors(value: RequirementMap, vocabulary: Vocabulary): Record<string, string[]> {
  const errors = validateProfiles({ custom: value }, vocabulary);
  const byBoundary: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(errors)) {
    byBoundary[key.slice("custom.".length)] = messages;
  }
  return byBoundary;
}

interface CustomRequiresEditorProps {
  value: RequirementMap;
  vocabulary: Vocabulary;
  onChange: (value: RequirementMap) => void;
}

/** The one inline requirements editor shared by TicketCreate and Editor. */
export function CustomRequiresEditor({ value, vocabulary, onChange }: CustomRequiresEditorProps): JSX.Element {
  const errors = requirementErrors(value, vocabulary);
  return (
    <fieldset className="custom-requires" aria-label="Custom profile requirements">
      <legend>Custom requirements</legend>
      <span className="hint">Comma-separated evidence for each stage boundary. Leave a field empty when it is not required.</span>
      {vocabulary.boundaries.map((boundary) => (
        <label className="field" key={boundary}>
          <span>{boundary}</span>
          <input
            aria-label={`Requirements for ${boundary}`}
            value={requirementsForEditor(value, boundary)}
            onChange={(event) => onChange(updateRequirementMap(value, boundary, event.target.value))}
            placeholder="plan, proof:visual"
            aria-invalid={errors[boundary] ? "true" : "false"}
          />
          {errors[boundary]?.map((message) => (
            <span className="error" key={message}>{message}</span>
          ))}
        </label>
      ))}
    </fieldset>
  );
}
