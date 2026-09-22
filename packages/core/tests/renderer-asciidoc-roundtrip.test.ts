import { describe, expect, test } from "vite-plus/test";
import { parseMarkdown } from "../src/parser/markdown-parser.ts";
import { parseAsciiDoc } from "../src/parser/asciidoc-parser.ts";
import { renderAsciiDocSource } from "../src/parser/asciidoc-writer.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import type { Element } from "../src/model/types.ts";

function stripLoc(el: Element) {
  const { loc, ...rest } = el;
  return { ...rest, loc: { file: loc.file, heading: loc.heading, prose: loc.prose } };
}

const mdSample = `## API

The gateway.

:::building-block
id: bb-api
title: API
technology: nginx
requires: if-db
:::

:::interface
id: if-db
title: DB
provider: bb-db
protocol: SQL
:::

:::building-block
id: bb-db
title: Database
:::
`;

const adocSample = `== API

The gateway.

[arc42.building-block]
----
id: bb-api
title: API
technology: nginx
requires: if-db
----

[arc42.interface]
----
id: if-db
title: DB
provider: bb-db
protocol: SQL
----

[arc42.building-block]
----
id: bb-db
title: Database
----
`;

describe("AsciiDoc source round-trip", () => {
  test("Markdown document survives parse → AsciiDoc source → parse", () => {
    const original = parseMarkdown("doc.arc42.md", mdSample);
    const written = renderAsciiDocSource([original]);
    const again = parseAsciiDoc("doc.arc42.adoc", written);
    expect(
      buildWorkspace([again])
        .elements.map((e) => e.id)
        .sort(),
    ).toEqual(
      buildWorkspace([original])
        .elements.map((e) => e.id)
        .sort(),
    );
    expect(
      buildWorkspace([again])
        .elements.map((e) => e.kind)
        .sort(),
    ).toEqual(
      buildWorkspace([original])
        .elements.map((e) => e.kind)
        .sort(),
    );
  });

  test("AsciiDoc document survives parse → source → parse", () => {
    const original = parseAsciiDoc("doc.arc42.adoc", adocSample);
    const written = renderAsciiDocSource([original]);
    const again = parseAsciiDoc("doc.arc42.adoc", written);
    expect(buildWorkspace([again]).elements.map(stripLoc)).toEqual(
      buildWorkspace([original]).elements.map(stripLoc),
    );
  });

  test("element count is unchanged", () => {
    const original = parseMarkdown("doc.arc42.md", mdSample);
    const again = parseAsciiDoc("doc.arc42.adoc", renderAsciiDocSource([original]));
    expect(buildWorkspace([again]).elements).toHaveLength(
      buildWorkspace([original]).elements.length,
    );
  });

  test("requires references still point at the same id", () => {
    const original = parseMarkdown("doc.arc42.md", mdSample);
    const again = parseAsciiDoc("doc.arc42.adoc", renderAsciiDocSource([original]));
    const api = buildWorkspace([again]).elements.find((e) => e.id === "bb-api");
    expect(api && "requires" in api ? api.requires : []).toContain("if-db");
  });

  test("JSON of elements matches after dropping loc.line", () => {
    const original = parseMarkdown("doc.arc42.md", mdSample);
    const again = parseAsciiDoc("doc.arc42.adoc", renderAsciiDocSource([original]));
    const stripFile = (el: ReturnType<typeof stripLoc>) => ({
      ...el,
      loc: { heading: el.loc.heading, prose: el.loc.prose },
    });
    expect(
      JSON.stringify(buildWorkspace([again]).elements.map((e) => stripFile(stripLoc(e)))),
    ).toBe(JSON.stringify(buildWorkspace([original]).elements.map((e) => stripFile(stripLoc(e)))));
  });

  test("attribute values survive", () => {
    const original = parseAsciiDoc("doc.arc42.adoc", adocSample);
    const again = parseAsciiDoc("doc.arc42.adoc", renderAsciiDocSource([original]));
    const iface = buildWorkspace([again]).elements.find((e) => e.id === "if-db");
    expect(iface && "protocol" in iface ? iface.protocol : undefined).toBe("SQL");
  });

  test("relationships survive", () => {
    const original = parseMarkdown("doc.arc42.md", mdSample);
    const again = parseAsciiDoc("doc.arc42.adoc", renderAsciiDocSource([original]));
    const iface = buildWorkspace([again]).elements.find((e) => e.id === "if-db");
    expect(iface && "provider" in iface ? iface.provider : undefined).toBe("bb-db");
  });

  test("prose attached to an element survives", () => {
    const original = parseMarkdown("doc.arc42.md", mdSample);
    const again = parseAsciiDoc("doc.arc42.adoc", renderAsciiDocSource([original]));
    const api = buildWorkspace([again]).elements.find((e) => e.id === "bb-api");
    expect(api?.loc.prose).toContain("The gateway.");
  });
});
