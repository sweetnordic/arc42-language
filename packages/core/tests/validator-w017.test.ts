import { describe, expect, test } from "vite-plus/test";
import { parseArchitectureDocument } from "../src/arc42.ts";
import { buildWorkspace } from "../src/model/builder.ts";
import { buildIndex } from "../src/resolver/index.ts";
import { validate } from "../src/validator/index.ts";

describe("W017 — bare mermaid source", () => {
  test("emitted for a bare [source,mermaid] block", () => {
    const content = `[source,mermaid]
----
graph TD
  A --> B
----`;
    const ws = buildWorkspace([parseArchitectureDocument("test.arc42.adoc", content)]);
    const diags = validate(ws, buildIndex(ws));
    expect(diags.some((d) => d.code === "W017")).toBe(true);
  });
});
