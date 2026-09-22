import type { DocumentAst, AstNode, BareMermaidNode } from "../ast.ts";
import type { Parser } from "./markdown-parser.ts";
import { createDiagramNode, splitList, type DiagramMetadata } from "./diagram-node.ts";

const DELIMITER = /^-{4,}\s*$/;
const BLOCK_OPENER = /^\[arc42\.([a-z][a-z0-9-]*)\]\s*$/;
const SOURCE_OPENER = /^\[source,([a-zA-Z0-9_-]+)\]\s*$/;
const HEADING = /^(={1,6})\s+(.+)$/;
const ATTRIBUTE = /^([a-z][a-z0-9-]*):\s*(.*)$/;
const BLOCK_COMMENT = /^\s*\/\/\/\/\s*$/;
const LINE_COMMENT = /^\s*\/\//;
const RULE_CODE = /^[a-zA-Z0-9]+[a-zA-Z0-9-]*$/;

/**
 * Line-oriented parser for .arc42.adoc files.
 * Produces the same DocumentAst contract as parseMarkdown.
 */
export function parseAsciiDoc(filePath: string, content: string): DocumentAst {
  const lines = content.split("\n");
  const nodes: AstNode[] = [];

  let inBlockComment = false;
  let pendingOpener: { blockType: string; startLine: number; line: string } | null = null;
  let openBlock: {
    blockType: string;
    attributes: Record<string, string>;
    startLine: number;
    ignoreLine?: string;
  } | null = null;
  let pendingDiagram: DiagramMetadata | null = null;
  let pendingSource: {
    kind: "diagram" | "bare";
    metadata?: DiagramMetadata;
    notation?: string;
    startLine: number;
    line: string;
  } | null = null;
  let openSource: {
    kind: "diagram" | "bare";
    metadata?: DiagramMetadata;
    source: string[];
    startLine: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i]!;

    if (inBlockComment) {
      if (BLOCK_COMMENT.test(line)) inBlockComment = false;
      continue;
    }
    if (BLOCK_COMMENT.test(line)) {
      inBlockComment = true;
      continue;
    }
    if (LINE_COMMENT.test(line)) continue;

    if (openSource) {
      if (DELIMITER.test(line)) {
        if (openSource.kind === "diagram" && openSource.metadata) {
          nodes.push(createDiagramNode(openSource.metadata, openSource.source.join("\n"), lineNo));
        } else {
          const node: BareMermaidNode = {
            kind: "bare-mermaid",
            source: openSource.source.join("\n"),
            startLine: openSource.startLine,
            endLine: lineNo,
          };
          nodes.push(node);
        }
        openSource = null;
      } else {
        openSource.source.push(line);
      }
      continue;
    }

    if (pendingSource) {
      if (line.trim() === "") continue;
      if (DELIMITER.test(line)) {
        openSource = {
          kind: pendingSource.kind,
          metadata: pendingSource.metadata,
          source: [],
          startLine: pendingSource.startLine,
        };
        pendingSource = null;
        continue;
      }
      if (pendingSource.kind === "diagram" && pendingSource.metadata) {
        nodes.push(createDiagramNode(pendingSource.metadata, "", pendingSource.metadata.startLine));
      } else {
        nodes.push({ kind: "prose", text: pendingSource.line, line: pendingSource.startLine });
      }
      pendingSource = null;
      // fall through and parse the current line
    }

    const waitingDiagram = pendingDiagram;
    if (waitingDiagram) {
      if (line.trim() === "") continue;
      const sourceMatch = SOURCE_OPENER.exec(line);
      if (sourceMatch) {
        pendingSource = {
          kind: "diagram",
          metadata: waitingDiagram,
          notation: sourceMatch[1],
          startLine: lineNo,
          line,
        };
        pendingDiagram = null;
        continue;
      }
      nodes.push(createDiagramNode(waitingDiagram, "", waitingDiagram.startLine));
      pendingDiagram = null;
      // fall through
    }

    if (pendingOpener) {
      if (line.trim() === "") continue;
      if (DELIMITER.test(line)) {
        openBlock = {
          blockType: pendingOpener.blockType,
          attributes: {},
          startLine: pendingOpener.startLine,
        };
        pendingOpener = null;
        continue;
      }
      nodes.push({ kind: "prose", text: pendingOpener.line, line: pendingOpener.startLine });
      pendingOpener = null;
      // fall through
    }

    if (openBlock !== null) {
      if (DELIMITER.test(line)) {
        const closedDiagram = closeBlock(nodes, openBlock, lineNo);
        if (closedDiagram) pendingDiagram = closedDiagram;
        openBlock = null;
        continue;
      }
      if (openBlock.blockType === "ignore") {
        if (openBlock.ignoreLine === undefined && line.trim() !== "") {
          openBlock.ignoreLine = line.trim();
        }
        continue;
      }
      const attrMatch = ATTRIBUTE.exec(line);
      if (attrMatch) {
        openBlock.attributes[attrMatch[1]!] = attrMatch[2]!;
      }
      continue;
    }

    const openerMatch = BLOCK_OPENER.exec(line);
    if (openerMatch) {
      pendingOpener = { blockType: openerMatch[1]!, startLine: lineNo, line };
      continue;
    }

    const sourceMatch = SOURCE_OPENER.exec(line);
    if (sourceMatch) {
      pendingSource = {
        kind: "bare",
        notation: sourceMatch[1],
        startLine: lineNo,
        line,
      };
      continue;
    }

    const headingMatch = HEADING.exec(line);
    if (headingMatch) {
      nodes.push({
        kind: "heading",
        level: headingMatch[1]!.length,
        text: headingMatch[2]!.trim(),
        line: lineNo,
      });
      continue;
    }

    nodes.push({ kind: "prose", text: line, line: lineNo });
  }

  if (openBlock !== null) {
    nodes.push({
      kind: "block",
      blockType: "__parse_error__",
      attributes: {
        message: `Unclosed block '[arc42.${openBlock.blockType}]' opened at line ${openBlock.startLine} — missing closing '----'`,
        startLine: String(openBlock.startLine),
      },
      startLine: openBlock.startLine,
      endLine: lines.length,
      inArc42Fence: true,
    });
  }

  if (pendingOpener) {
    nodes.push({
      kind: "block",
      blockType: "__parse_error__",
      attributes: {
        message: `Unclosed block '[arc42.${pendingOpener.blockType}]' opened at line ${pendingOpener.startLine} — missing closing '----'`,
        startLine: String(pendingOpener.startLine),
      },
      startLine: pendingOpener.startLine,
      endLine: lines.length,
      inArc42Fence: true,
    });
  }

  const leftoverDiagram = pendingDiagram;
  if (leftoverDiagram) {
    nodes.push(createDiagramNode(leftoverDiagram, "", leftoverDiagram.startLine));
  }

  if (openSource) {
    if (openSource.kind === "diagram" && openSource.metadata) {
      nodes.push(
        createDiagramNode(openSource.metadata, openSource.source.join("\n"), lines.length),
      );
    } else {
      nodes.push({
        kind: "bare-mermaid",
        source: openSource.source.join("\n"),
        startLine: openSource.startLine,
        endLine: lines.length,
      });
    }
  }

  return { filePath, nodes };
}

function closeBlock(
  dest: AstNode[],
  block: {
    blockType: string;
    attributes: Record<string, string>;
    startLine: number;
    ignoreLine?: string;
  },
  endLine: number,
): DiagramMetadata | null {
  if (block.blockType === "diagram") {
    return {
      id: block.attributes["id"] ?? "",
      scenario: block.attributes["scenario"] ?? "",
      view: block.attributes["view"],
      notation: block.attributes["notation"] ?? "",
      roots: splitList(block.attributes["roots"]),
      aliases: block.attributes["aliases"] ?? "",
      startLine: block.startLine,
    };
  }
  if (block.blockType === "ignore") {
    dest.push(parseIgnore(block.ignoreLine, block.startLine, endLine));
    return null;
  }
  dest.push({
    kind: "block",
    blockType: block.blockType,
    attributes: block.attributes,
    startLine: block.startLine,
    endLine,
    inArc42Fence: true,
  });
  return null;
}

function parseIgnore(body: string | undefined, startLine: number, endLine: number): AstNode {
  if (!body) {
    return { kind: "ignore", ruleCode: "", startLine, endLine };
  }
  const contentMatch = /^([^:\s]+)(?:\s+(.*?))?\s*$/.exec(body);
  if (contentMatch && RULE_CODE.test(contentMatch[1]!)) {
    return {
      kind: "ignore",
      ruleCode: contentMatch[1]!,
      reason: contentMatch[2] ? contentMatch[2].trim() : undefined,
      startLine,
      endLine,
    };
  }
  return { kind: "ignore", ruleCode: "", startLine, endLine };
}

export class AsciiDocParser implements Parser {
  parse(filePath: string, content: string): DocumentAst {
    return parseAsciiDoc(filePath, content);
  }
}
