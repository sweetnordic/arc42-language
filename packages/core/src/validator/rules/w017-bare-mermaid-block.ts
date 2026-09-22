import type { Rule, Diagnostic } from "../types.ts";
import type { Workspace } from "../../model/types.ts";
import type { ReferenceIndex } from "../../resolver/types.ts";
import type { BareMermaidNode } from "../../ast.ts";

/**
 * W017 — A bare ```mermaid fenced block has no preceding :::diagram metadata block.
 *
 * Diagrams should always be introduced by a :::diagram block that provides
 * a machine-readable id, notation, and optionally scenario/view linkage.
 * This makes diagrams discoverable by tooling and keeps them traceable to
 * the runtime scenarios or deployment views they illustrate.
 *
 * Without a :::diagram block the diagram is anonymous — it renders in the
 * web UI but cannot be queried, validated, or cross-referenced.
 */
export const w017BareMermaidBlock: Rule = {
  meta: {
    code: "W017",
    severity: "warning",
    type: "suggestion",
    docs: {
      description:
        "Mermaid source has no diagram metadata — add :::diagram before a ```mermaid fence in Markdown, or [arc42.diagram] before [source,…] in AsciiDoc",
      rationale:
        "A :::diagram block before the ```mermaid fence gives the diagram an id and links it to a runtime scenario or deployment view. Without it the diagram is anonymous: it renders visually but cannot be queried, validated against the model, or cross-referenced from other elements. The Markdown fix is a :::diagram block inside ```arc42 immediately before the ```mermaid fence. In AsciiDoc write [arc42.diagram] then ---- attributes ---- and a following [source,mermaid] block.",
      arc42Chapter: 6,
      recommended: true,
    },
  },
  check(workspace: Workspace, _index: ReferenceIndex): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const doc of workspace.documents) {
      for (const node of doc.nodes) {
        if ((node as BareMermaidNode).kind === "bare-mermaid") {
          const bare = node as BareMermaidNode;
          diagnostics.push({
            code: "W017",
            severity: "warning",
            message:
              "Mermaid diagram has no :::diagram metadata block — add :::diagram with id and notation before the ```mermaid fence",
            file: doc.filePath,
            line: bare.startLine,
          });
        }
      }
    }

    return diagnostics;
  },
};
