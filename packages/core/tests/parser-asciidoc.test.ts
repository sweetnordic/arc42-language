import { expect, test, describe } from "vite-plus/test";
import { parseAsciiDoc } from "../src/parser/asciidoc-parser.ts";
import type { BlockNode, HeadingNode, ProseNode, IgnoreNode } from "../src/ast.ts";

function blocks(adoc: string) {
  return parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is BlockNode => n.kind === "block",
  );
}
function headings(adoc: string) {
  return parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is HeadingNode => n.kind === "heading",
  );
}
function prose(adoc: string) {
  return parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is ProseNode => n.kind === "prose",
  );
}
function ignores(adoc: string) {
  return parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
    (n): n is IgnoreNode => n.kind === "ignore",
  );
}

function qualityGoal(extra = ""): string {
  return `[arc42.quality-goal]
----
id: qg-1
title: Performance
priority: high
${extra}----`;
}

describe("asciidoc parser — basic structure", () => {
  test("parses a simple block with attributes", () => {
    const result = blocks(qualityGoal());
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[0]!.attributes["id"]).toBe("qg-1");
    expect(result[0]!.attributes["title"]).toBe("Performance");
    expect(result[0]!.attributes["priority"]).toBe("high");
  });

  test("parses headings at levels 1-3 from = / == / ===", () => {
    const result = headings("= H1\n== H2\n=== H3");
    expect(result).toHaveLength(3);
    expect(result[0]!.level).toBe(1);
    expect(result[1]!.level).toBe(2);
    expect(result[2]!.level).toBe(3);
  });

  test("parses prose lines outside blocks", () => {
    const adoc = `Some explanation text.\n${qualityGoal()}\nMore prose.`;
    const result = prose(adoc);
    expect(result.some((p) => p.text.includes("Some explanation"))).toBe(true);
    expect(result.some((p) => p.text.includes("More prose"))).toBe(true);
  });

  test("preserves blank lines as empty prose nodes", () => {
    const adoc = `First paragraph.\n\nSecond paragraph.`;
    const result = prose(adoc);
    expect(result.some((p) => p.text === "")).toBe(true);
    expect(result.some((p) => p.text.includes("Second paragraph"))).toBe(true);
  });

  test("parses two typed blocks in one file", () => {
    const adoc = `[arc42.quality-goal]
----
id: qg-1
title: A
priority: high
----
[arc42.concept]
----
id: c-1
title: B
----`;
    const result = blocks(adoc);
    expect(result).toHaveLength(2);
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[1]!.blockType).toBe("concept");
  });

  test("unknown block type is emitted as a block", () => {
    const adoc = `[arc42.unknown-type]
----
id: x
----`;
    const result = blocks(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("unknown-type");
  });

  test("unclosed ---- emits __parse_error__", () => {
    const adoc = `[arc42.building-block]
----
id: bb-1
title: X`;
    const result = blocks(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.blockType).toBe("__parse_error__");
  });
});

describe("asciidoc parser — comments", () => {
  test("line comments are dropped", () => {
    const adoc = `// this is a comment\n${qualityGoal()}`;
    const result = blocks(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.attributes["id"]).toBe("qg-1");
    expect(prose(adoc).some((p) => p.text.includes("this is a comment"))).toBe(false);
  });

  test("block comments are dropped", () => {
    const adoc = `////
[arc42.building-block]
----
id: fake
title: Should not be parsed
----
////
${qualityGoal()}`;
    const result = blocks(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.attributes["id"]).toBe("qg-1");
  });

  test("indented block comments are dropped", () => {
    const adoc = `  ////
[arc42.building-block]
----
id: hidden
title: Should not be parsed
----
  ////
${qualityGoal()}`;
    const result = blocks(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.attributes["id"]).toBe("qg-1");
  });

  test("headings inside comments are not headings", () => {
    const adoc = `////
== Hidden Heading
////
== Visible Heading`;
    const result = headings(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Visible Heading");
  });

  test("prose inside comments is not prose", () => {
    const adoc = `// hidden prose\nvisible prose`;
    const result = prose(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("visible prose");
  });

  test("comment inside a block is dropped before attributes", () => {
    const adoc = `[arc42.quality-goal]
----
id: qg-1
// skip this
title: Performance
priority: high
----`;
    const result = blocks(adoc);
    expect(result[0]!.attributes["id"]).toBe("qg-1");
    expect(result[0]!.attributes["title"]).toBe("Performance");
    expect(result[0]!.attributes["priority"]).toBe("high");
  });

  test("a comment does not swallow the following block", () => {
    const adoc = `// ignore me\n${qualityGoal()}`;
    expect(blocks(adoc)).toHaveLength(1);
  });
});

describe("asciidoc parser — block syntax", () => {
  test("parses [arc42.quality-goal] attributes", () => {
    const result = blocks(qualityGoal());
    expect(result[0]!.blockType).toBe("quality-goal");
    expect(result[0]!.attributes).toEqual({
      id: "qg-1",
      title: "Performance",
      priority: "high",
    });
  });

  test("records startLine and endLine", () => {
    const adoc = `line one
[arc42.building-block]
----
id: bb-1
title: X
----`;
    const result = blocks(adoc);
    expect(result[0]!.startLine).toBe(2);
    expect(result[0]!.endLine).toBe(6);
  });

  test("parses several blocks", () => {
    const adoc = `[arc42.constraint]
----
id: con-1
title: A
----
[arc42.decision]
----
id: dec-1
title: B
----
[arc42.risk]
----
id: risk-1
title: C
----`;
    expect(blocks(adoc).map((b) => b.blockType)).toEqual(["constraint", "decision", "risk"]);
  });

  test("accepts a delimiter of more than four hyphens", () => {
    const adoc = `[arc42.concept]
------
id: c-1
title: X
------`;
    const result = blocks(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.attributes["id"]).toBe("c-1");
  });

  test("keeps a colon in the attribute value", () => {
    const adoc = `[arc42.interface]
----
id: if-1
title: API
protocol: HTTPS: REST
----`;
    expect(blocks(adoc)[0]!.attributes["protocol"]).toBe("HTTPS: REST");
  });

  test("keeps an empty attribute value", () => {
    const adoc = `[arc42.building-block]
----
id: bb-1
title: X
technology:
----`;
    expect(blocks(adoc)[0]!.attributes["technology"]).toBe("");
  });

  test("ignores a non-attribute body line", () => {
    const adoc = `[arc42.building-block]
----
id: bb-1
this is not an attribute
title: X
----`;
    const result = blocks(adoc)[0]!;
    expect(result.attributes["id"]).toBe("bb-1");
    expect(result.attributes["title"]).toBe("X");
    expect(Object.keys(result.attributes)).toEqual(["id", "title"]);
  });

  test("typed blocks have inArc42Fence true", () => {
    expect(blocks(qualityGoal())[0]!.inArc42Fence).toBe(true);
  });

  test("parses diagram metadata fields", () => {
    const adoc = `[arc42.diagram]
----
id: d-1
view: building-block
notation: mermaid
roots: bb-api
aliases: gw=bb-api
----`;
    const diagrams = parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
      (n) => n.kind === "diagram",
    );
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]).toMatchObject({
      id: "d-1",
      view: "building-block",
      notation: "mermaid",
      roots: ["bb-api"],
      aliases: "gw=bb-api",
    });
  });

  test("missing closing delimiter is a parse error", () => {
    const adoc = `[arc42.actor]
----
id: actor-1
title: User`;
    expect(blocks(adoc)[0]!.blockType).toBe("__parse_error__");
  });
});

describe("asciidoc parser — ignore directives", () => {
  test("parses a valid directive with rule code and reason", () => {
    const adoc = `[arc42.ignore]
----
H014 This is only a demo for the arc42, code is out of scope
----`;
    const result = ignores(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("H014");
    expect(result[0]!.reason).toBe("This is only a demo for the arc42, code is out of scope");
  });

  test("missing rule code yields an empty ruleCode", () => {
    const adoc = `[arc42.ignore]
----
----`;
    const result = ignores(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("");
  });

  test("malformed body is retained as an ignore node", () => {
    const adoc = `[arc42.ignore]
----
!!! not a rule
----`;
    const result = ignores(adoc);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleCode).toBe("");
  });
});

describe("asciidoc parser — diagrams", () => {
  test("diagram plus [source,…] fills source", () => {
    const adoc = `[arc42.diagram]
----
id: d-1
view: building-block
notation: mermaid
----
[source,mermaid]
----
graph TD
  A --> B
----`;
    const diagrams = parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
      (n) => n.kind === "diagram",
    );
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]!.source).toBe("graph TD\n  A --> B");
  });

  test("bare [source,…] is a BareMermaidNode", () => {
    const adoc = `[source,mermaid]
----
graph TD
  A --> B
----`;
    const nodes = parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
      (n) => n.kind === "bare-mermaid",
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.source).toContain("graph TD");
  });

  test("diagram with no following source block has empty source", () => {
    const adoc = `[arc42.diagram]
----
id: d-1
notation: mermaid
----
== Next heading`;
    const diagrams = parseAsciiDoc("test.arc42.adoc", adoc).nodes.filter(
      (n) => n.kind === "diagram",
    );
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]!.source).toBe("");
  });
});
