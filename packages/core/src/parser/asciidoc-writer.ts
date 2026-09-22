import type { DocumentAst, AstNode, DiagramNode } from "../ast.ts";

/** Serialize one or more documents to re-parsable AsciiDoc source. */
export function renderAsciiDocSource(documents: DocumentAst[]): string {
  return documents.map(renderDocument).join("\n");
}

function renderDocument(document: DocumentAst): string {
  const lines: string[] = [];
  for (const node of document.nodes) {
    lines.push(...renderNode(node));
  }
  return lines.join("\n");
}

function renderNode(node: AstNode): string[] {
  switch (node.kind) {
    case "heading":
      return [`${"=".repeat(node.level)} ${node.text}`];
    case "prose":
      return [node.text];
    case "block":
      return [
        `[arc42.${node.blockType}]`,
        "----",
        ...Object.entries(node.attributes).map(([key, value]) => `${key}: ${value}`),
        "----",
      ];
    case "ignore": {
      const body = node.reason ? `${node.ruleCode} ${node.reason}` : node.ruleCode;
      return ["[arc42.ignore]", "----", body, "----"];
    }
    case "diagram":
      return renderDiagram(node);
    case "bare-mermaid":
      return ["[source,mermaid]", "----", node.source, "----"];
  }
}

function renderDiagram(node: DiagramNode): string[] {
  const attrs: string[] = [`id: ${node.id}`];
  if ("view" in node && node.view) attrs.push(`view: ${node.view}`);
  if ("scenario" in node && node.scenario) attrs.push(`scenario: ${node.scenario}`);
  if (node.notation) attrs.push(`notation: ${node.notation}`);
  if ("roots" in node && node.roots.length > 0) attrs.push(`roots: ${node.roots.join(", ")}`);
  if (node.aliases) attrs.push(`aliases: ${node.aliases}`);
  const lines = ["[arc42.diagram]", "----", ...attrs, "----"];
  if (node.source) {
    lines.push("", `[source,${sourceLanguage(node.notation)}]`, "----", node.source, "----");
  }
  return lines;
}

function sourceLanguage(notation: string): string {
  if (notation.startsWith("mermaid")) return notation === "mermaid-sequence" ? "mermaid" : notation;
  return notation || "mermaid";
}
