import { expect, test, describe } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { parseAsciiDoc } from "../src/parser/asciidoc-parser.ts";
import type { AstNode, BlockNode, DiagramNode, HeadingNode, IgnoreNode } from "../src/ast.ts";

function semantic(node: AstNode): unknown {
  if (node.kind === "block") {
    const n = node as BlockNode;
    return { kind: n.kind, blockType: n.blockType, attributes: n.attributes };
  }
  if (node.kind === "heading") {
    const n = node as HeadingNode;
    return { kind: n.kind, level: n.level, text: n.text };
  }
  if (node.kind === "ignore") {
    const n = node as IgnoreNode;
    return { kind: n.kind, ruleCode: n.ruleCode, reason: n.reason };
  }
  if (node.kind === "diagram") {
    const n = node as DiagramNode;
    return {
      kind: n.kind,
      diagramType: n.diagramType,
      id: n.id,
      notation: n.notation,
      source: n.source,
      ...("view" in n ? { view: n.view } : {}),
      ...("scenario" in n ? { scenario: n.scenario } : {}),
    };
  }
  if (node.kind === "bare-mermaid") {
    return { kind: node.kind, source: node.source };
  }
  if (node.kind === "prose") {
    return { kind: node.kind, text: node.text };
  }
  return { kind: (node as AstNode).kind };
}

function compare(md: string, adoc: string) {
  const mdNodes = parseMarkdown("test.arc42.md", md).nodes.map(semantic);
  const adocNodes = parseAsciiDoc("test.arc42.adoc", adoc).nodes.map(semantic);
  expect(adocNodes).toEqual(mdNodes);
}

describe("parser equivalence — Markdown vs AsciiDoc", () => {
  test("quality goal", () => {
    compare(
      `:::quality-goal
id: qg-1
title: Performance
priority: high
:::`,
      `[arc42.quality-goal]
----
id: qg-1
title: Performance
priority: high
----`,
    );
  });

  test("building block with attributes", () => {
    compare(
      `:::building-block
id: bb-api
title: API
technology: nginx
implements: concept-logging
requires: if-catalog
:::`,
      `[arc42.building-block]
----
id: bb-api
title: API
technology: nginx
implements: concept-logging
requires: if-catalog
----`,
    );
  });

  test("several blocks with comments stripped from both", () => {
    compare(
      `<!-- skip -->
:::quality-goal
id: qg-1
title: A
priority: high
:::
:::concept
id: c-1
title: B
:::`,
      `// skip
[arc42.quality-goal]
----
id: qg-1
title: A
priority: high
----
[arc42.concept]
----
id: c-1
title: B
----`,
    );
  });

  test("diagram with notation and source", () => {
    compare(
      `\`\`\`arc42
:::diagram
id: d-1
view: building-block
notation: mermaid
:::
\`\`\`
\`\`\`mermaid
graph TD
  A --> B
\`\`\``,
      `[arc42.diagram]
----
id: d-1
view: building-block
notation: mermaid
----
[source,mermaid]
----
graph TD
  A --> B
----`,
    );
  });

  test("ignore directive with rule code and reason", () => {
    compare(
      `\`\`\`arc42
:::ignore H014 demo reason :::
\`\`\``,
      `[arc42.ignore]
----
H014 demo reason
----`,
    );
  });

  test("headings at levels 1, 2, and 3", () => {
    compare(`# One\n## Two\n### Three`, `= One\n== Two\n=== Three`);
  });

  test("unknown block type kept as a block node", () => {
    compare(
      `:::unknown-type
id: x
:::`,
      `[arc42.unknown-type]
----
id: x
----`,
    );
  });

  test("prose and blank lines preserved", () => {
    compare(`Hello.\n\nWorld.`, `Hello.\n\nWorld.`);
  });

  test("actor", () => {
    compare(
      `:::actor
id: actor-user
title: End User
type: person
requires: if-api
:::`,
      `[arc42.actor]
----
id: actor-user
title: End User
type: person
requires: if-api
----`,
    );
  });

  test("interface", () => {
    compare(
      `:::interface
id: if-api
title: API
provider: bb-api
protocol: HTTPS
:::`,
      `[arc42.interface]
----
id: if-api
title: API
provider: bb-api
protocol: HTTPS
----`,
    );
  });

  test("decision", () => {
    compare(
      `:::decision
id: dec-1
title: Use REST
status: accepted
:::`,
      `[arc42.decision]
----
id: dec-1
title: Use REST
status: accepted
----`,
    );
  });

  test("risk", () => {
    compare(
      `:::risk
id: risk-1
title: Outage
probability: high
impact: high
:::`,
      `[arc42.risk]
----
id: risk-1
title: Outage
probability: high
impact: high
----`,
    );
  });

  test("glossary term", () => {
    compare(
      `:::glossary-term
id: term-1
title: Bounded Context
definition: A model boundary.
:::`,
      `[arc42.glossary-term]
----
id: term-1
title: Bounded Context
definition: A model boundary.
----`,
    );
  });

  test("runtime scenario", () => {
    compare(
      `:::runtime-scenario
id: rs-1
title: Checkout
:::`,
      `[arc42.runtime-scenario]
----
id: rs-1
title: Checkout
----`,
    );
  });

  test("deployment node", () => {
    compare(
      `:::deployment-node
id: dn-1
title: Web
:::`,
      `[arc42.deployment-node]
----
id: dn-1
title: Web
----`,
    );
  });

  test("constraint", () => {
    compare(
      `:::constraint
id: con-1
title: GDPR
category: organizational
:::`,
      `[arc42.constraint]
----
id: con-1
title: GDPR
category: organizational
----`,
    );
  });

  test("quality scenario", () => {
    compare(
      `:::quality-scenario
id: qs-1
title: Search latency
quality: qg-1
metric: p95 < 200ms
:::`,
      `[arc42.quality-scenario]
----
id: qs-1
title: Search latency
quality: qg-1
metric: p95 < 200ms
----`,
    );
  });
});
