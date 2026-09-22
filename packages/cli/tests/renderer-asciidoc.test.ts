import { describe, expect, test } from "vite-plus/test";
import { getElementsFromDocuments, parseArchitectureDocument } from "@arc42/core";
import type { ElementView, WorkspaceView } from "@arc42/core";
import { AsciiDocGetRenderer } from "../src/renderer/asciidoc.ts";
import { builtinGetRenderers } from "../src/renderer/index.ts";

const renderer = new AsciiDocGetRenderer();

function view(md: string, file = "architecture.arc42.md"): WorkspaceView {
  return getElementsFromDocuments({
    documents: [parseArchitectureDocument(file, md)],
    query: { kind: "workspace" },
  }) as WorkspaceView;
}

function elementView(md: string, id: string, file = "architecture.arc42.md"): ElementView {
  return getElementsFromDocuments({
    documents: [parseArchitectureDocument(file, md)],
    query: { kind: "element", id },
  }) as ElementView;
}

describe("asciidoc renderer — basic", () => {
  test("empty workspace renders a document title", () => {
    const output = renderer.render(view(""));
    expect(output).toContain("= arc42 Architecture");
  });

  test("single quality goal renders", () => {
    const output = renderer.render(
      view(`## Goal\n\nProse.\n\n:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\n:::`),
    );
    expect(output).toContain("qg-1");
    expect(output).toContain("priority: high");
  });

  test("single building block renders", () => {
    const output = renderer.render(
      view(`## API\n\n:::building-block\nid: bb-api\ntitle: API\ntechnology: TypeScript\n:::`),
    );
    expect(output).toContain("bb-api");
    expect(output).toContain("technology: TypeScript");
  });

  test("multiple elements render in chapter order", () => {
    const output = renderer.render(
      view(`:::constraint
id: con-1
title: GDPR
category: organizational
:::
:::quality-goal
id: qg-1
title: Fast
priority: high
:::`),
    );
    expect(output.indexOf("con-1")).toBeLessThan(output.indexOf("qg-1"));
    expect(output).toContain("== Chapter 2");
    expect(output).toContain("== Chapter 10");
  });

  test("registry exposes the asciidoc renderer", () => {
    expect(renderer.meta.id).toBe("asciidoc");
    expect(builtinGetRenderers.some((r) => r.meta.id === "asciidoc")).toBe(true);
  });
});

describe("asciidoc renderer — element kinds", () => {
  test("quality-goal with priority", () => {
    expect(
      renderer.render(
        view(`:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\nscenario: qs-1\n:::`),
      ),
    ).toContain("priority: high");
  });

  test("quality-scenario with quality and metric", () => {
    expect(
      renderer.render(
        view(
          `:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\n:::\n:::quality-scenario\nid: qs-1\ntitle: Search\nquality: qg-1\nmetric: p95 < 200ms\n:::`,
        ),
      ),
    ).toContain("metric: p95 < 200ms");
  });

  test("constraint with category", () => {
    expect(
      renderer.render(view(`:::constraint\nid: con-1\ntitle: GDPR\ncategory: organizational\n:::`)),
    ).toContain("category: organizational");
  });

  test("actor with type and requires", () => {
    expect(
      renderer.render(
        view(
          `:::actor\nid: actor-1\ntitle: User\ntype: person\nrequires: if-1\n:::\n:::interface\nid: if-1\ntitle: API\nprovider: bb-1\n:::\n:::building-block\nid: bb-1\ntitle: API\n:::`,
        ),
      ),
    ).toContain("type: person");
  });

  test("solution-strategy with addresses", () => {
    expect(
      renderer.render(
        view(
          `:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\n:::\n:::solution-strategy\nid: ss-1\ntitle: Cache\naddresses: qg-1\n:::`,
        ),
      ),
    ).toContain("addresses: qg-1");
  });

  test("building-block with technology and connections", () => {
    expect(
      renderer.render(
        view(
          `:::building-block\nid: bb-api\ntitle: API\ntechnology: nginx\nrequires: if-db\n:::\n:::interface\nid: if-db\ntitle: DB\nprovider: bb-db\n:::\n:::building-block\nid: bb-db\ntitle: DB\n:::`,
        ),
      ),
    ).toContain("requires: if-db");
  });

  test("interface with provider and protocol", () => {
    expect(
      renderer.render(
        view(
          `:::interface\nid: if-1\ntitle: API\nprovider: bb-1\nprotocol: HTTPS\n:::\n:::building-block\nid: bb-1\ntitle: API\n:::`,
        ),
      ),
    ).toContain("protocol: HTTPS");
  });

  test("runtime-scenario with involves", () => {
    expect(
      renderer.render(
        view(
          `:::runtime-scenario\nid: rs-1\ntitle: Checkout\ninvolves: bb-1\n:::\n:::building-block\nid: bb-1\ntitle: API\n:::`,
        ),
      ),
    ).toContain("involves: bb-1");
  });

  test("deployment-node with hosts", () => {
    expect(
      renderer.render(
        view(
          `:::deployment-node\nid: dn-1\ntitle: Web\ntype: server\nhosts: bb-1\n:::\n:::building-block\nid: bb-1\ntitle: API\n:::`,
        ),
      ),
    ).toContain("type: server");
  });

  test("concept", () => {
    expect(renderer.render(view(`:::concept\nid: c-1\ntitle: Logging\n:::`))).toContain("c-1");
  });

  test("decision statuses", () => {
    const output = renderer.render(
      view(`:::decision
id: dec-1
title: REST
status: accepted
date: 2026-01-10
:::
:::decision
id: dec-2
title: Old
status: superseded
:::
:::decision
id: dec-3
title: Idea
status: proposed
:::
:::decision
id: dec-4
title: Gone
status: deprecated
:::`),
    );
    expect(output).toContain("status: accepted");
    expect(output).toContain("status: superseded");
    expect(output).toContain("status: proposed");
    expect(output).toContain("status: deprecated");
    expect(output).toContain("date: 2026-01-10");
  });

  test("risk with severity", () => {
    expect(
      renderer.render(view(`:::risk\nid: risk-1\ntitle: Outage\nseverity: high\n:::`)),
    ).toContain("severity: high");
  });

  test("glossary-term with definition", () => {
    expect(
      renderer.render(
        view(`:::glossary-term\nid: term-1\ntitle: BC\ndefinition: A model boundary.\n:::`),
      ),
    ).toContain("definition: A model boundary.");
  });
});

describe("asciidoc renderer — references and fields", () => {
  test("interface names its building block", () => {
    const output = renderer.render(
      elementView(
        `## API\n\n:::building-block\nid: bb-1\ntitle: API\n:::\n## Contract\n\n:::interface\nid: if-1\ntitle: API\nprovider: bb-1\n:::`,
        "if-1",
      ),
    );
    expect(output).toContain("bb-1");
  });

  test("missing reference is the plain id", () => {
    const output = renderer.render(
      view(`:::building-block\nid: bb-1\ntitle: API\nrequires: if-missing\n:::`),
    );
    expect(output).toContain("if-missing");
  });

  test("element view shows outgoing and incoming refs", () => {
    const output = renderer.render(
      elementView(
        `:::building-block\nid: bb-api\ntitle: API\n:::\n:::building-block\nid: bb-client\ntitle: Client\nrequires: if-api\n:::\n:::interface\nid: if-api\ntitle: API\nprovider: bb-api\n:::`,
        "if-api",
      ),
    );
    expect(output).toContain("== References");
    expect(output).toMatch(/incoming|outgoing/);
    expect(output).toContain("bb-api");
  });

  test("circular references still render", () => {
    const output = renderer.render(
      view(`:::building-block
id: bb-a
title: A
requires: if-b
:::
:::building-block
id: bb-b
title: B
requires: if-a
:::
:::interface
id: if-a
title: A
provider: bb-a
:::
:::interface
id: if-b
title: B
provider: bb-b
:::`),
    );
    expect(output).toContain("bb-a");
    expect(output).toContain("bb-b");
  });

  test("string fields render as key: value", () => {
    expect(
      renderer.render(view(`:::concept\nid: c-1\ntitle: Logging\ncategory: observability\n:::`)),
    ).toContain("category: observability");
  });

  test("list fields match the markdown renderer shape", () => {
    expect(
      renderer.render(
        view(
          `:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\n:::\n:::solution-strategy\nid: ss-1\ntitle: Cache\naddresses: qg-1\n:::`,
        ),
      ),
    ).toContain("addresses: qg-1");
  });

  test("empty fields are omitted", () => {
    const output = renderer.render(view(`:::concept\nid: c-1\ntitle: Logging\n:::`));
    expect(output).not.toContain("category:");
  });

  test("values containing : or ---- stay on one line", () => {
    const output = renderer.render(
      view(
        `:::interface\nid: if-1\ntitle: API\nprovider: bb-1\nprotocol: HTTPS: REST ---- v2\n:::\n:::building-block\nid: bb-1\ntitle: API\n:::`,
      ),
    );
    expect(output).toContain("protocol: HTTPS: REST ---- v2");
  });

  test("dates stay ISO-8601", () => {
    expect(
      renderer.render(
        view(`:::decision\nid: dec-1\ntitle: REST\nstatus: accepted\ndate: 2026-01-10\n:::`),
      ),
    ).toContain("date: 2026-01-10");
  });

  test("workspace headings are =, ==, ===", () => {
    const output = renderer.render(
      view(`:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\n:::`),
    );
    expect(output).toMatch(/^= /);
    expect(output).toContain("== Chapter");
    expect(output).toContain("=== qg-1");
  });

  test("a blank line separates elements", () => {
    const output = renderer.render(
      view(
        `:::quality-goal\nid: qg-1\ntitle: Fast\npriority: high\n:::\n:::quality-goal\nid: qg-2\ntitle: Safe\npriority: medium\n:::`,
      ),
    );
    expect(output).toMatch(/qg-1[\s\S]*\n\n=== qg-2/);
  });

  test("element view includes references when refs exist", () => {
    const output = renderer.render(
      elementView(
        `:::building-block\nid: bb-1\ntitle: API\n:::\n:::interface\nid: if-1\ntitle: API\nprovider: bb-1\n:::`,
        "bb-1",
      ),
    );
    expect(output).toContain("== References");
  });
});
