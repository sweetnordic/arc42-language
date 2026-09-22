import { describe, expect, test } from "vite-plus/test";
import { convertMarkdownToAsciiDoc } from "../src/converter/asciidoc.ts";
import { CHAPTERS } from "../src/chapters.ts";

describe("convertMarkdownToAsciiDoc", () => {
  test("keeps Mermaid arrows that look like HTML comment closers", () => {
    const converted = convertMarkdownToAsciiDoc(`# View

\`\`\`mermaid
graph TD
    a -->|"if-x"| b
    cache-->>cat: hit
    api:R --> L:db
\`\`\`
`);
    expect(converted).toContain('a -->|"if-x"| b');
    expect(converted).toContain("cache-->>cat: hit");
    expect(converted).toContain("api:R --> L:db");
    expect(converted).not.toContain("////>");
  });

  test("converts HTML comments without rewriting arrows inside them", () => {
    const converted = convertMarkdownToAsciiDoc(`# Title

<!--
guidance
    bb-api:R --> L:bb-database
-->
`);
    expect(converted).toContain("////");
    expect(converted).toContain("bb-api:R --> L:bb-database");
    expect(converted).not.toContain("<!--");
  });

  for (const item of CHAPTERS) {
    test(`chapter ${item.number} (${item.slug}) stays in the converter subset`, () => {
      const found = leftoverKinds(item.template);
      const allowed = [...(ALLOWED_LEFTOVERS[item.number] ?? [])].sort();
      expect(
        found,
        [
          `Chapter ${item.number} (${item.slug}) uses Markdown that convertMarkdownToAsciiDoc does not convert: ${found.join(", ") || "(none)"}.`,
          `Allowed leftovers for this chapter: ${allowed.join(", ") || "(none)"}.`,
          "Teach the converter or keep the starter in the supported subset.",
        ].join(" "),
      ).toEqual(allowed);
    });
  }


});


/**
 * Markdown kinds that `convertMarkdownToAsciiDoc` copies through unchanged.
 * Chapter 1 already ships a pipe table and Markdown links; nothing else may appear
 * until the converter learns that syntax.
 */
const ALLOWED_LEFTOVERS: Readonly<Record<number, readonly string[]>> = {
  1: ["gfm-table", "markdown-link"],
};

function stripKnownFences(markdown: string): string {
  return markdown.replace(/```(?:arc42|mermaid[a-zA-Z0-9_-]*)\n[\s\S]*?\n```/g, "");
}

function leftoverKinds(markdown: string): string[] {
  const text = stripKnownFences(markdown);
  const found = new Set<string>();

  if (/\*\*[^*]+\*\*/.test(text) || /__[^_]+__/.test(text)) found.add("emphasis-bold");
  if (/(?<!\*)\*(?!\*)[^*\n]+\*(?!\*)/.test(text)) found.add("emphasis-italic");
  if (/(?<![A-Za-z0-9])_[^_\s][^_]*_(?![A-Za-z0-9])/.test(text)) found.add("emphasis-italic");
  if (/~~[^~]+~~/.test(text)) found.add("strikethrough");
  if (/!\[[^\]]*\]\([^)]+\)/.test(text)) found.add("image");
  if (/(?<!!)\[[^\]]+\]\([^)]+\)/.test(text)) found.add("markdown-link");
  if (/^\s*\|.+\|\s*$/m.test(text)) found.add("gfm-table");
  if (/^\s*>\s+\S/m.test(text)) found.add("blockquote");
  if (/^\s*[-*+]\s+\[[ xX]\]\s+/m.test(text)) found.add("task-list");
  for (const match of text.matchAll(/^```([a-zA-Z][a-zA-Z0-9_-]*)\s*$/gm)) {
    const lang = match[1]!;
    if (lang !== "arc42" && !lang.startsWith("mermaid")) found.add("unknown-fence");
  }
  if (
    /<\/?(?:div|span|p|br|img|a|table|tr|td|ul|ol|li|code|pre|em|strong|h[1-6])[\s/>]/i.test(
      text,
    )
  ) {
    found.add("html-tag");
  }

  return [...found].sort();
}
