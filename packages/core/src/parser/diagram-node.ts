import type { DiagramNode } from "../ast.ts";

export interface DiagramMetadata {
  id: string;
  scenario?: string;
  view?: string;
  notation: string;
  roots: string[];
  aliases: string;
  startLine: number;
}

export function splitList(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function createDiagramNode(
  metadata: DiagramMetadata,
  source: string,
  endLine: number,
): DiagramNode {
  if (metadata.view === "building-block") {
    return {
      kind: "diagram",
      diagramType: "building-block",
      view: "building-block",
      id: metadata.id,
      notation: metadata.notation,
      roots: metadata.roots,
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  if (metadata.view === "context") {
    return {
      kind: "diagram",
      diagramType: "context",
      view: "context",
      id: metadata.id,
      notation: metadata.notation,
      roots: metadata.roots,
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  if (metadata.view === "deployment") {
    return {
      kind: "diagram",
      diagramType: "deployment",
      view: "deployment",
      id: metadata.id,
      notation: metadata.notation,
      roots: metadata.roots,
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  if (metadata.notation === "mermaid-sequence") {
    return {
      kind: "diagram",
      diagramType: "sequence",
      id: metadata.id,
      scenario: metadata.scenario ?? "",
      notation: "mermaid-sequence",
      aliases: metadata.aliases,
      source,
      startLine: metadata.startLine,
      endLine,
    };
  }

  return {
    kind: "diagram",
    diagramType: "generic",
    id: metadata.id,
    notation: metadata.notation,
    aliases: metadata.aliases,
    source,
    startLine: metadata.startLine,
    endLine,
  };
}
