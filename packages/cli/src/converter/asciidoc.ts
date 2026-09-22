/** Convert HTML comments to AsciiDoc `////` comments without touching Mermaid `-->` arrows. */
function convertHtmlComments(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inComment = false;

  for (const line of lines) {
    if (!inComment) {
      const open = line.indexOf("<!--");
      if (open === -1) {
        out.push(line);
        continue;
      }
      const before = line.slice(0, open);
      const afterOpen = line.slice(open + 4);
      const close = afterOpen.lastIndexOf("-->");
      if (close !== -1 && afterOpen.slice(close + 3).trim() === "") {
        out.push(`${before}////${afterOpen.slice(0, close)}////`);
        continue;
      }
      inComment = true;
      out.push(`${before}////${afterOpen}`);
      continue;
    }

    if (/^\s*-->\s*$/.test(line)) {
      out.push("////");
      inComment = false;
      continue;
    }
    out.push(line);
  }

  return out.join("\n");
}

/**
 * Line-oriented rewrite of Markdown chapter source to AsciiDoc authoring form.
 *
 * Used by `arc42 init --format asciidoc` (writes files) and `arc42 guide chapter --format
 * asciidoc` (converts only the embedded starter; the surrounding prompt stays Markdown).
 *
 * This is not a GitHub Flavored Markdown implementation and not a model parser. It does
 * not go through `parseMarkdown` / `DocumentAst`. Unrecognized Markdown is copied through.
 *
 * Rewrites:
 * - `#` … `######` headings → `=` … `======`
 * - `<!-- … -->` comments → `////` (only a line that is just `-->` closes a multi-line
 *   comment, so Mermaid `-->` / `-->>` arrows are left alone)
 * - ` ```arc42 ` fences are stripped; `:::type` / `:::ignore` → `[arc42.type]` / `[arc42.ignore]`
 *   plus `----`
 * - ` ```mermaid ` → `[source,mermaid]` plus `----`
 * - the substring `.arc42.md` → `.arc42.adoc` on every other line
 *
 * Does not convert, and will appear as Markdown inside the `.adoc` file:
 * - emphasis (`**bold**`, `*italic*`, `_italic_`, `~~strike~~`)
 * - links (`[text](url)` stays that syntax; only the `.arc42.md` suffix is rewritten)
 * - images, blockquotes, task lists, inline code
 * - GFM pipe tables
 * - numbered or bullet lists (copied as-is; they often look acceptable)
 * - fenced code that is not `arc42` or `mermaid` (for example ` ```js `)
 * - HTML other than comments
 */
export function convertMarkdownToAsciiDoc(markdown: string): string {
  const lines = convertHtmlComments(markdown).split("\n");
  const out: string[] = [];
  let inArc42 = false;
  let inMermaid = false;

  for (const line of lines) {
    if (!inMermaid && /^```arc42\s*$/.test(line)) {
      inArc42 = true;
      continue;
    }
    if (inArc42 && /^```\s*$/.test(line)) {
      inArc42 = false;
      continue;
    }
    if (!inArc42 && /^```mermaid[a-zA-Z0-9_-]*\s*$/.test(line)) {
      inMermaid = true;
      out.push("[source,mermaid]", "----");
      continue;
    }
    if (inMermaid && /^```\s*$/.test(line)) {
      inMermaid = false;
      out.push("----");
      continue;
    }

    const singleIgnore = /^:::ignore\s+([^:\s]+)(?:\s+(.*?))?\s*:::\s*$/.exec(line);
    if (singleIgnore) {
      const reason = singleIgnore[2] ? ` ${singleIgnore[2].trim()}` : "";
      out.push("[arc42.ignore]", "----", `${singleIgnore[1]}${reason}`, "----");
      continue;
    }
    const openIgnore = /^:::ignore(?:\s+([^:\s]+))?(?:\s+(.*?))?\s*$/.exec(line);
    if (openIgnore) {
      const reason = openIgnore[2] ? ` ${openIgnore[2].trim()}` : "";
      out.push("[arc42.ignore]", "----");
      if (openIgnore[1]) out.push(`${openIgnore[1]}${reason}`);
      continue;
    }
    const openType = /^:::([a-z][a-z0-9-]*)\s*$/.exec(line);
    if (openType) {
      out.push(`[arc42.${openType[1]}]`, "----");
      continue;
    }
    if (/^:::\s*$/.test(line)) {
      out.push("----");
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      out.push(`${"=".repeat(heading[1]!.length)} ${heading[2]}`);
      continue;
    }

    out.push(line.replace(/\.arc42\.md/g, ".arc42.adoc"));
  }

  return out.join("\n");
}
