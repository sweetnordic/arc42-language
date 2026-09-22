import { afterEach, describe, expect, test } from "vite-plus/test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { filename, CHAPTERS } from "../src/chapters.ts";

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const createdDirs: string[] = [];

function run(root: string | undefined, ...args: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      "--conditions=development",
      cliPath,
      ...(root ? ["--dir", root] : []),
      ...args,
    ],
    { encoding: "utf8" },
  );
}

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), "arc42-adoc-cli-"));
  createdDirs.push(root);
  return root;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const validAdoc = `= Architecture

== Service

The service.

[arc42.building-block]
----
id: service
title: Service
----
`;

describe("CLI AsciiDoc validate", () => {
  test("valid AsciiDoc chapter exits 0", () => {
    const root = tempDir();
    writeFileSync(join(root, "architecture.arc42.adoc"), validAdoc);
    expect(run(root, "validate").status).toBe(0);
  });

  test("duplicate id exits 1 and reports the .adoc path", () => {
    const root = tempDir();
    writeFileSync(
      join(root, "architecture.arc42.adoc"),
      `${validAdoc}
[arc42.building-block]
----
id: service
title: Other
----
`,
    );
    const result = run(root, "validate", "--format", "json");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(".arc42.adoc");
  });

  test("mixed directory reports both suffixes", () => {
    const root = tempDir();
    writeFileSync(
      join(root, "a.arc42.md"),
      "# A\n\n```arc42\n:::building-block\nid: shared\ntitle: A\n:::\n```\n",
    );
    writeFileSync(
      join(root, "b.arc42.adoc"),
      `= B\n\n[arc42.building-block]\n----\nid: shared\ntitle: B\n----\n`,
    );
    const result = run(root, "validate", "--format", "json");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(".arc42.md");
    expect(result.stdout).toContain(".arc42.adoc");
  });
});

describe("CLI init", () => {
  test("writes twelve AsciiDoc chapter files", () => {
    const root = tempDir();
    const result = run(undefined, "init", "--dir", root, "--format", "asciidoc");
    expect(result.status).toBe(0);
    const names = readdirSync(root).sort();
    expect(names).toEqual(
      CHAPTERS.map((chapter) => filename(chapter).replace(/\.arc42\.md$/, ".arc42.adoc")).sort(),
    );
  });

  test("second run skips existing files", () => {
    const root = tempDir();
    run(undefined, "init", "--dir", root, "--format", "asciidoc");
    const again = run(undefined, "init", "--dir", root, "--format", "asciidoc");
    expect(again.status).toBe(0);
    expect(again.stderr).toContain("already exists");
    expect(again.stdout).toContain("Wrote 0");
  });

  test("markdown format writes .arc42.md only", () => {
    const root = tempDir();
    run(undefined, "init", "--dir", root, "--format", "markdown");
    const names = readdirSync(root);
    expect(names.every((name) => name.endsWith(".arc42.md"))).toBe(true);
    expect(names.some((name) => name.endsWith(".adoc"))).toBe(false);
  });

  test("unknown format exits 2", () => {
    const root = tempDir();
    expect(run(undefined, "init", "--dir", root, "--format", "rtf").status).toBe(2);
  });

  test("AsciiDoc init directory validates", () => {
    const root = tempDir();
    run(undefined, "init", "--dir", root, "--format", "asciidoc");
    expect(run(root, "validate").status).toBe(0);
  });

  test("generated files use AsciiDoc headings and blocks", () => {
    const root = tempDir();
    run(undefined, "init", "--dir", root, "--format", "asciidoc");
    const sample = readFileSync(join(root, "02-constraints.arc42.adoc"), "utf8");
    expect(sample.startsWith("= ")).toBe(true);
    expect(sample).toContain("[arc42.constraint]");
    expect(sample).not.toContain(":::constraint");
  });

  test("cross-chapter links target .arc42.adoc", () => {
    const root = tempDir();
    run(undefined, "init", "--dir", root, "--format", "asciidoc");
    const intro = readFileSync(join(root, "01-introduction-and-goals.arc42.adoc"), "utf8");
    expect(intro).toContain("10-quality-requirements.arc42.adoc");
    expect(intro).not.toContain("10-quality-requirements.arc42.md");
  });
});

describe("CLI explain, guide, coverage, get", () => {
  test("explain building-block shows both syntaxes", () => {
    const result = run(undefined, "explain", "building-block");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("```arc42");
    expect(result.stdout).toContain("[arc42.building-block]");
  });

  test("explain diagram includes [source,mermaid]", () => {
    const result = run(undefined, "explain", "diagram", "building-block");
    expect(result.stdout).toContain("[source,mermaid]");
  });

  test("explain ignore includes both forms", () => {
    const result = run(undefined, "explain", "ignore");
    expect(result.stdout).toContain("[arc42.ignore]");
    expect(result.stdout).toContain(":::ignore");
  });

  test("rules text for W016 mentions both wrappers", () => {
    const result = run(undefined, "rules");
    expect(result.stdout).toContain("[arc42.");
    expect(result.stdout).toContain("```arc42");
  });

  test("guide chapter 2 --format asciidoc uses AsciiDoc blocks", () => {
    const result = run(undefined, "guide", "chapter", "2", "--format", "asciidoc");
    expect(result.stdout).toContain("[arc42.constraint]");
    expect(result.stdout).not.toContain("```arc42");
  });

  test("guide chapter 2 without --format stays Markdown", () => {
    const result = run(undefined, "guide", "chapter", "2");
    expect(result.stdout).toContain("```arc42");
    expect(result.stdout).toContain(":::constraint");
  });

  test("get --format asciidoc is accepted", () => {
    const root = tempDir();
    writeFileSync(join(root, "architecture.arc42.adoc"), validAdoc);
    const result = run(root, "get", "--format", "asciidoc");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("= arc42 Architecture");
  });

  test("coverage claims a path from an AsciiDoc building block", () => {
    const root = tempDir();
    mkdirSync(join(root, "src", "api"), { recursive: true });
    writeFileSync(join(root, "src", "api", "index.ts"), "export {}\n");
    writeFileSync(
      join(root, "architecture.arc42.adoc"),
      `= Architecture

== API

The API.

[arc42.building-block]
----
id: bb-api
title: API
path: src/api
----
`,
    );
    const result = run(root, "coverage");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("src/api");
  });

  test("serve help mentions .arc42.adoc", () => {
    const result = run(undefined, "serve", "--help");
    expect(result.stdout).toContain(".arc42.adoc");
  });

  test("loadWorkspace payload after init includes .arc42.adoc paths", async () => {
    const { loadWorkspace } = await import("@arc42/workspace-fs");
    const root = tempDir();
    run(undefined, "init", "--dir", root, "--format", "asciidoc");
    const payload = await loadWorkspace(root);
    expect(payload.documents.every((doc) => doc.filePath.endsWith(".arc42.adoc"))).toBe(true);
    expect(payload.documents).toHaveLength(12);
  });
});
