/** Convert a Markdown chapter template into the AsciiDoc authoring form. */
export function markdownTemplateToAsciiDoc(template: string): string {
  const lines = template.replaceAll("<!--", "////").replaceAll("-->", "////").split("\n");
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
