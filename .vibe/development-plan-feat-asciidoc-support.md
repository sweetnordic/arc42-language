# Development Plan: AsciiDoc support

*Workflow: Feature Implementation with Testing*

## Goal

Support AsciiDoc as a second authoring format with the same CLI behavior as Markdown. Every command that reads, writes, explains, or scaffolds `.arc42.md` does the same for `.arc42.adoc`.

Markdown stays the default. `.arc42.md` behavior does not change.

## Key Decisions

- Architecture files use the double extension `.arc42.adoc`. Plain `.adoc` and `.asciidoc` files are not architecture documents.
- `parseArchitectureDocument(filePath, content)` in `packages/core/src/arc42.ts` picks the parser from the path. `.arc42.adoc` uses `AsciiDocParser`. Every other path uses `MarkdownParser`.
- Both parsers emit the same `DocumentAst`. The builder, validator, and get query do not branch on format.
- Blocks opened by `[arc42.<type>]` set `inArc42Fence: true`, so W016 does not fire on AsciiDoc.
- Parsing is line-oriented, matching `parseMarkdown`: headings, prose, typed blocks, diagrams, ignore directives, and a `__parse_error__` node for an unclosed block.
- `//` at the start of a line (optional leading whitespace) is a line comment. A line of optional whitespace plus `////` starts a block comment that ends at the next such line. Leading indentation is allowed. Comments are skipped before block recognition, including inside `----` regions.
- `=` is heading level 1 and `==` is heading level 2, through six levels.
- Diagrams and ignores do not use `:::` in AsciiDoc. `:::` stays the Markdown container syntax.
- `arc42 get --format asciidoc` is a `GetRenderer` in `packages/cli/src/renderer/`, registered beside `text`, `json`, and `markdown`. It is a workspace view, not a chapter file.
- `arc42 init` writes starter files. `--format markdown` writes `.arc42.md`. `--format asciidoc` writes `.arc42.adoc`. The default is markdown. Existing files are left in place.
- Two writers, two jobs. `renderAsciiDocSource` in `packages/core/src/parser/asciidoc-writer.ts` serializes a `DocumentAst` back to AsciiDoc for round-trip tests. `convertMarkdownToAsciiDoc` in `packages/cli/src/converter/asciidoc.ts` rewrites Markdown chapter starters for `init` and `guide`. The converter does not call `parseMarkdown`. It is not `AsciiDocGetRenderer`. `arc42 get` output is not parsed back.
- The converter is a line-oriented subset. It rewrites headings, HTML comments, `arc42` fences, `:::type` / `:::ignore`, mermaid fences, and the `.arc42.md` substring. Emphasis, Markdown links (the suffix is still rewritten), images, blockquotes, task lists, inline code, GFM tables, other fences, and other HTML are copied through. Each chapter template is checked so new unsupported Markdown fails the converter test.
- HTML comment conversion only treats a line that is just `-->` as a closer, so Mermaid `-->` and `-->>` stay intact.
- `arc42 guide chapter <n> --format asciidoc` converts only the embedded starter. The surrounding guide prompt stays Markdown.
- Round-trip compares element kind, id, and schema fields. Line numbers and comments may differ.
- `examples/bookstore-backend-asciidoc/` is the AsciiDoc bookstore workspace: the same twelve chapters as `examples/bookstore-backend`, authored as `.arc42.adoc`.

## Command coverage

| Command | AsciiDoc behavior |
| --- | --- |
| `validate` | Loads `*.arc42.adoc`. W015 and E016 accept that suffix. Help names both suffixes. |
| `get` | `--format asciidoc` prints the workspace or one element, including `--type`. |
| `coverage` | A `path` on an AsciiDoc building block or interface is claimed. |
| `rules` | W016 and W017 docs name the AsciiDoc form as well as the Markdown form. |
| `explain` | Block, diagram, and ignore explanations include an AsciiDoc example beside the Markdown example. |
| `guide` | `arc42 guide chapter <n> --format asciidoc` converts only the embedded starter. The surrounding prompt stays Markdown. Migration text accepts either suffix. |
| `diff` | Working tree, index, and a named revision include `*.arc42.adoc`. |
| `serve` | Reloads when a `*.arc42.adoc` file changes. Sidebar strips `.arc42.adoc`. |
| `build` | An AsciiDoc workspace builds. Hashes keep the `.arc42.adoc` filename. |
| `init` | `--format asciidoc` writes twelve `NN-<slug>.arc42.adoc` chapters. |

## Syntax

| Markdown | AsciiDoc |
| --- | --- |
| `# Title` | `= Title` |
| `## Title` | `== Title` |
| prose, including blank lines | same |
| ` ```arc42 ` / `:::building-block` / `key: value` / `:::` / ` ``` ` | `[arc42.building-block]` then `----`, the same `key: value` lines, then `----` |
| `:::ignore H014 reason :::` | `[arc42.ignore]` body whose first line is `H014 reason` |
| `:::diagram` plus a following mermaid fence | `[arc42.diagram]` attribute block, then `[source,mermaid]` … `----` |
| bare mermaid fence | bare `[source,mermaid]` … `----` |
| `<!-- ... -->` | `//` and `////` … `////` |

Typed block:

```asciidoc
[arc42.building-block]
----
id: bb-api-gateway
title: API Gateway
technology: nginx
----
```

The opener is `[arc42.` plus a type matching `[a-z][a-z0-9-]*` plus `]`, alone on the line. The next non-empty line is a delimiter of four or more hyphens. Attribute lines use `^([a-z][a-z0-9-]*):\s*(.*)$`. A closing delimiter ends the block. An unclosed block emits `__parse_error__`.

Ignore. The first non-empty body line is the rule code plus an optional reason:

```asciidoc
[arc42.ignore]
----
H014 This is only a demo for the arc42, code is out of scope
----
```

Diagram. The source block follows the attribute block:

```asciidoc
[arc42.diagram]
----
id: bb-view-all
view: building-block
notation: mermaid
----

[source,mermaid]
----
graph TD
  bb-api-gateway --> bb-catalog-service
----
```

`[source,<notation>]` after a diagram block becomes `DiagramNode.source`. `[source,…]` with no preceding diagram becomes `BareMermaidNode`.

## Explore

### Tasks

- [x] Read `packages/core/src/parser/markdown-parser.ts` and list the states the AsciiDoc parser must mirror: comments, open block, pending ignore, pending diagram, bare mermaid, unclosed block.
- [x] Read `packages/core/src/ast.ts` and confirm `BlockNode.inArc42Fence`, `DiagramNode`, `IgnoreNode`, and `BareMermaidNode` need no new fields.
- [x] Read `packages/core/src/arc42.ts` `parseArchitectureDocument` and `packages/workspace-fs/src/index.ts` `discoverFiles`.
- [x] Read `packages/workspace-fs/src/git-diff.ts` and note both `.arc42.md` filters.
- [x] Read `packages/core/src/path-utils.ts` `chapterNumberFromFile` and the W015 test that skips files not ending in `.arc42.md`.
- [x] Read `packages/cli/src/renderer/markdown.ts` and `packages/cli/src/renderer/index.ts` for the get-renderer pattern.
- [x] Read `packages/cli/src/cli.ts` command dispatch, `runGet`, and the serve `watch` callback.
- [x] Read `packages/cli/src/chapters.ts` `CHAPTERS` and `filename`, plus `packages/cli/src/guide.ts`.
- [x] Read `packages/core/src/explain.ts` ignore syntax and `packages/core/src/validator/rules/w016-block-not-in-arc42-fence.ts` and `w017-bare-mermaid-block.ts`.
- [x] Read `packages/web/src/utils.ts` `basename` and `packages/skill/SKILL.md`.

### Entrance criteria

- [x] The syntax table above matches the Markdown parser's nodes.
- [x] Every command in the coverage table has a file to change.
- [x] Test files named below do not already exist.

## Plan

### Tasks

- [x] Lock the grammar in the Syntax section. Do not add a second `[arc42]` wrapper around typed blocks.
- [x] Lock file touch list:
  - `packages/core/src/parser/asciidoc-parser.ts` (new)
  - `packages/core/src/parser/asciidoc-writer.ts` (new, AST → AsciiDoc for round-trip)
  - `packages/core/src/parser/diagram-node.ts` (shared `createDiagramNode` for both parsers)
  - `packages/core/src/arc42.ts`
  - `packages/core/src/path-utils.ts`
  - `packages/core/src/explain.ts`
  - `packages/core/src/validator/rules/w016-block-not-in-arc42-fence.ts`
  - `packages/core/src/validator/rules/w017-bare-mermaid-block.ts`
  - `packages/workspace-fs/src/index.ts`
  - `packages/workspace-fs/src/git-diff.ts`
  - `packages/cli/src/renderer/asciidoc.ts` (new)
  - `packages/cli/src/renderer/index.ts`
  - `packages/cli/src/cli.ts`
  - `packages/cli/src/help.ts`
  - `packages/cli/src/chapters.ts`
  - `packages/cli/src/guide.ts`
  - `packages/cli/src/converter/asciidoc.ts` (new, `convertMarkdownToAsciiDoc` for init and guide)
  - `packages/web/src/utils.ts`
  - `packages/skill/SKILL.md`
  - `packages/cli/README.md`
  - `examples/bookstore-backend-asciidoc/` (twelve `.arc42.adoc` chapters)
- [x] Lock test files:
  - `packages/core/tests/parser-asciidoc.test.ts`
  - `packages/core/tests/parser-equivalence.test.ts`
  - `packages/core/tests/renderer-asciidoc-roundtrip.test.ts`
  - `packages/cli/tests/renderer-asciidoc.test.ts`
  - `packages/cli/tests/converter-asciidoc.test.ts`
  - `packages/cli/tests/asciidoc-cli.test.ts` (validate, init, explain, guide, coverage, get, serve help, build payload)
  - extensions of `packages/workspace-fs/tests/workspace-fs.test.ts`, `packages/workspace-fs/tests/git-diff.test.ts`, `packages/cli/tests/help.test.ts`, `packages/core/tests/validator-w015.test.ts`, `packages/core/tests/validator-e016.test.ts`, `packages/core/tests/validator-w016.test.ts`, `packages/core/tests/validator-w017` (or the existing bare-mermaid test module)
- [x] Sequence the Code waves below. Each wave is red, then green, then `pnpm test` for the packages that wave touches.

### Entrance criteria

- [x] Grammar, file list, and wave order are unchanged from this section.
- [x] Wave 1 is the only wave that may start.

## Code

Implement in order. Write the listed tests first and see them fail, then implement until they pass. Do not start a wave until the previous wave's tests pass.

### Wave 1 — Parser

- [x] **Red.** Create `packages/core/tests/parser-asciidoc.test.ts`. Copy the helpers in `packages/core/tests/parser.test.ts` (`blocks`, `headings`, `prose`, `ignores`) and call `parseAsciiDoc`. Cover at least 25 cases:
  - Basic structure (7): one typed block, heading levels 1–3 from `=` / `==` / `===`, prose, blank lines kept as prose, two blocks, unknown type kept as a block, unclosed `----` emits `__parse_error__`.
  - Comments (7): `//` line dropped, `////` block dropped, indented `////` block dropped, heading inside a comment is not a heading, prose inside a comment is not prose, comment inside a block dropped before attributes, a comment does not swallow the next block.
  - Block syntax (10): `[arc42.quality-goal]` attributes, `startLine` / `endLine`, several blocks, delimiter of more than four hyphens, `key: value` with a colon in the value, empty value, non-attribute body line ignored, `inArc42Fence === true`, diagram metadata fields, missing closing delimiter.
  - Ignore (3): `H014 reason` → rule code and reason, missing rule code → empty `ruleCode`, malformed body retained as an ignore node.
  - Diagrams (3): `[arc42.diagram]` plus `[source,mermaid]` fills `source`, bare `[source,mermaid]` is `BareMermaidNode`, diagram with no following source has empty `source`.
- [x] **Red.** Create `packages/core/tests/parser-equivalence.test.ts` with at least 15 pairs. Each pair parses Markdown with `parseMarkdown` and the translated AsciiDoc with `parseAsciiDoc`, then compares kind, block type, attributes, heading level and text, diagram id/view/notation/source, and ignore rule/reason:
  - quality goal, building block with attributes, several blocks with comments, diagram, ignore, heading levels 1–3, unknown type, prose and blank lines, actor, interface, decision, risk, glossary term, runtime scenario, deployment node, constraint, quality scenario.
- [x] **Green.** Add `packages/core/src/parser/asciidoc-parser.ts`.
  - Export `parseAsciiDoc(filePath, content): DocumentAst` and `class AsciiDocParser implements Parser`.
  - Reuse `createDiagramNode` from `packages/core/src/parser/diagram-node.ts` (building-block, context, deployment, mermaid-sequence, generic). Both parsers call that helper; do not fork the diagram shape.
  - Skip `//` and `////` lines during the scan, including indented `////`, then recognize headings, blocks, diagrams, and ignores as specified in Syntax.
- [x] **Green.** In `parseArchitectureDocument`, if `filePath` ends with `.arc42.adoc`, call `AsciiDocParser`. Otherwise keep `MarkdownParser`.
- [x] **Verify.** `pnpm --filter @arc42/core test` passes, including the new files. Existing `parser.test.ts` is unchanged.

### Wave 2 — Load AsciiDoc files

- [x] **Red.** In `packages/workspace-fs/tests/workspace-fs.test.ts`, assert `discoverFiles` returns `.arc42.md` and `.arc42.adoc` and skips `notes.adoc`. Assert `readWorkspaceDocuments` returns both architecture files.
- [x] **Red.** In `packages/core/tests/validator-w015.test.ts`, a `06-runtime-view.arc42.adoc` whose first heading is not the chapter title emits W015. `06-runtime-view.md` still does not.
- [x] **Red.** In `packages/core/tests/validator-e016.test.ts`, an interface documented in `05-building-blocks.arc42.adoc` is accepted, and an actor in that same file emits E016.
- [x] **Green.** `discoverFiles` in `packages/workspace-fs/src/index.ts` keeps names ending in `.arc42.md` or `.arc42.adoc`.
- [x] **Green.** `chapterNumberFromFile` in `packages/core/src/path-utils.ts` accepts both suffixes, then the existing `^(\d{2})-` rule.
- [x] **Verify.** `pnpm --filter @arc42/core test` and `pnpm --filter @arc42/workspace-fs test` pass.

### Wave 3 — Validate on the CLI

- [x] **Red.** Add a CLI test that writes one valid `.arc42.adoc` chapter and expects `arc42 validate` exit 0, then a duplicate-id error and exit 1, with `file` ending in `.arc42.adoc`.
- [x] **Red.** A directory with one `.arc42.md` error and one `.arc42.adoc` error reports both paths.
- [x] **Red.** Extend `packages/core/tests/validator-w016.test.ts`: a `[arc42.building-block]` block does not emit W016.
- [x] **Red.** A bare `[source,mermaid]` block emits W017.
- [x] **Red.** An `[arc42.ignore]` for a hint suppresses that hint the same way `:::ignore` does.
- [x] **Green.** Update the `validate` string in `packages/cli/src/help.ts` to say `*.arc42.md` and `*.arc42.adoc`.
- [x] **Green.** Adjust W016 and W017 `docs.description` so each sentence that tells the author what to write also names the AsciiDoc form: `[arc42.<type>]` / `----` for W016, `[arc42.diagram]` plus `[source,…]` for W017. Keep the Markdown sentence.
- [x] **Verify.** `pnpm --filter @arc42/cli test` and the core validator tests pass. `arc42 validate --dir examples/bookstore-backend` still exits 0.

### Wave 4 — `arc42 get --format asciidoc`

- [x] **Red.** Create `packages/cli/tests/renderer-asciidoc.test.ts` with at least 29 tests. Follow `packages/cli/tests/renderer.test.ts` for how a `GetResult` is built.
  - Basic (5): empty workspace starts with `= `, one quality goal, one building block, several elements in chapter order, `meta.id === "asciidoc"` and the renderer is in `builtinGetRenderers`.
  - One test per kind (14): `constraint`, `actor`, `solution-strategy`, `building-block`, `interface`, `runtime-scenario`, `deployment-node`, `concept`, `decision`, `quality-goal`, `quality-scenario`, `risk`, `glossary-term`, plus decision status values `proposed`, `accepted`, `deprecated`, `superseded` inside the decision test.
  - References (4): interface names its building block, missing target renders the plain id, element view shows outgoing and incoming, two elements that reference each other both render.
  - Fields (5): `key: value`, list fields match the Markdown renderer's shape, empty fields omitted, a value containing `:` or `----` stays on one line, dates stay ISO-8601.
  - Formatting (3): workspace headings are `=`, `==`, `===`; a blank line between elements; element view has a references section when refs exist.
- [x] **Green.** Add `packages/cli/src/renderer/asciidoc.ts` class `AsciiDocGetRenderer implements GetRenderer`.
  - `meta.id` is `asciidoc`, `mimeType` is `text/asciidoc`.
  - Copy the field selection from `markdown.ts` (`workspaceFields` / `elementFields`). Change only the heading marks and the link syntax.
  - Resolved ref: `<<file#anchor,id>> — kind` when `loc.heading` is set, otherwise the id.
  - Location line uses the same xref shape.
- [x] **Green.** Register the instance in `packages/cli/src/renderer/index.ts` `builtinGetRenderers`.
- [x] **Green.** In `commandHelp("get")`, list `asciidoc` next to `text`, `json`, and `markdown`. Add one `arc42 get --format asciidoc` example to `packages/cli/README.md`.
- [x] **Verify.** CLI renderer tests pass. `arc42 get --format markdown` output is unchanged.

### Wave 5 — Converter, init, round-trip

- [x] **Red.** Create `packages/core/tests/renderer-asciidoc-roundtrip.test.ts` with at least 5 read → AsciiDoc source → read cases and 3 preservation cases:
  - Markdown sample → `parseMarkdown` → `renderAsciiDocSource` → `parseAsciiDoc` → same element kind, id, and schema fields.
  - AsciiDoc sample → parse → render → parse → same fields.
  - Element count unchanged.
  - A `requires` or `implements` reference still points at the same id.
  - JSON of elements with `loc.line` removed matches.
  - Attribute values, relationships, and `loc.prose` survive.
- [x] **Red.** CLI tests for init:
  - `arc42 init --format asciidoc --dir <empty>` writes exactly the twelve names from `filename()`, with `.adoc` instead of `.md`.
  - A second run writes nothing and reports each skipped file.
  - `--format markdown` writes `.arc42.md` only.
  - An unknown `--format` exits 2.
  - `arc42 validate --dir` on the AsciiDoc directory exits 0.
  - Generated chapter title is a level-1 heading. Example blocks are `[arc42.<type>]`, not `:::`.
  - A cross-chapter link targets `.arc42.adoc`.
- [x] **Red.** In `packages/cli/tests/converter-asciidoc.test.ts`, a mermaid fence that contains `-->` and `-->>` survives, an HTML comment becomes `////` without rewriting arrows inside it, and every `CHAPTERS` template stays inside the converter subset (chapter 1 may keep a GFM table and Markdown links).
- [x] **Green.** Add `renderAsciiDocSource(documents: DocumentAst[]): string` in `packages/core/src/parser/asciidoc-writer.ts`. It emits the Syntax section from an AST: `=` headings, prose lines, `[arc42.<type>]` blocks, `[arc42.ignore]`, `[arc42.diagram]` plus `[source,…]`. This is what the round-trip tests call. It is not `AsciiDocGetRenderer` and not the init converter.
- [x] **Green.** Add `convertMarkdownToAsciiDoc(markdown: string): string` in `packages/cli/src/converter/asciidoc.ts`, used by init and guide. It does not parse to a `DocumentAst`. Rewrites:
  - `#` … `######` at line start → `=` … `======`
  - `<!-- … -->` → `////`, and only a line that is just `-->` closes a multi-line comment, so Mermaid `-->` / `-->>` stay
  - ` ```arc42 ` fences are stripped; `:::type` / `:::ignore` → `[arc42.type]` / `[arc42.ignore]` plus `----`
  - ` ```mermaid ` → `[source,mermaid]` plus `----`
  - the substring `.arc42.md` → `.arc42.adoc` on every other line
  - Leave emphasis, Markdown links, images, blockquotes, task lists, inline code, GFM tables, other fences, and other HTML unchanged.
- [x] **Green.** Add `runInit` in `packages/cli/src/cli.ts`, dispatched before workspace discovery the same way `guide` is, so init does not warn about a missing workspace.
  - Flags: `--dir <path>` (default cwd), `--format markdown|asciidoc` (default `markdown`).
  - Write `filename(chapter)` for markdown. For asciidoc, replace the `.md` suffix with `.adoc` and write `convertMarkdownToAsciiDoc(chapter.template)`.
  - `mkdir` the directory. If the destination file exists, print a skip line and continue.
- [x] **Green.** Add `init` to `COMMANDS` and `commandHelp("init")` in `packages/cli/src/help.ts`.
- [x] **Verify.** Round-trip tests and init tests pass. `arc42 init --format asciidoc` on a temp dir validates.

### Wave 6 — Explain, guide, skill

- [x] **Red.** Help or CLI tests:
  - `arc42 explain building-block` contains both ` ```arc42 ` and `[arc42.building-block]`.
  - `arc42 explain diagram building-block` contains `[source,mermaid]`.
  - `arc42 explain ignore` contains `[arc42.ignore]` and `:::ignore`.
  - `arc42 rules` output for W016 contains both wrappers.
  - `arc42 guide chapter 2 --format asciidoc` contains `[arc42.constraint]` and does not contain a ` ```arc42 ` fence.
  - `arc42 guide chapter 2` without `--format` stays Markdown.
- [x] **Green.** In `packages/core/src/explain.ts`, append an AsciiDoc example to each block explanation, each diagram explanation, and `IGNORE_DATA.syntax`. Build the block example from the type name: `[arc42.<type>]`, `----`, one line per required field, `----`.
- [x] **Green.** `runGuide` accepts `--format markdown|asciidoc` on `chapter`. Pass only the chapter template through `convertMarkdownToAsciiDoc` when the format is asciidoc. The guide prompt around that starter stays Markdown.
- [x] **Green.** In `packages/cli/src/guide.ts`, describe chapter files as `*.arc42.md` or `*.arc42.adoc` and say the workspace uses one suffix.
- [x] **Green.** In `packages/skill/SKILL.md`, name both suffixes in the description and workflow, and show the `[arc42.ignore]` example next to the existing `:::ignore` fence.
- [x] **Verify.** Explain, rules, and guide tests pass. `arc42 guide chapter 1` Markdown output is unchanged apart from the suffix wording in the migration guide.

### Wave 7 — Diff, coverage, serve, build

- [x] **Red.** In `packages/workspace-fs/tests/git-diff.test.ts`, a repo whose only change is `architecture.arc42.adoc` appears in `currentDocuments` for a working-tree diff, a staged diff, and a diff against a parent revision.
- [x] **Red.** A CLI coverage test: an AsciiDoc building block with `path: src/api` makes `arc42 coverage` report `src/api` as claimed.
- [x] **Red.** `basename("05-building-blocks.arc42.adoc")` in `packages/web/src/utils.ts` returns `05-building-blocks`.
- [x] **Red.** Serve help mentions `.arc42.adoc`. A built site payload includes a document whose `filePath` ends with `.arc42.adoc`.
- [x] **Green.** Replace both `.arc42.md` filters in `packages/workspace-fs/src/git-diff.ts` with the same suffix check as `discoverFiles`.
- [x] **Green.** In `runServe`, reload when the changed name ends with `.arc42.md` or `.arc42.adoc`.
- [x] **Green.** `basename` strips `.arc42.adoc` before the `.md` fallback.
- [x] **Green.** Help strings for `validate`, `serve`, and `diff` name both suffixes where they currently say only `*.arc42.md`.
- [x] **Verify.** workspace-fs, web, and CLI tests pass. `arc42 build --out <tmp>` on an AsciiDoc init directory writes a site whose workspace JSON lists the twelve `.arc42.adoc` files.

## Commit

- [x] Review the diff against the file list in Plan. No drive-by edits.
- [x] `pnpm run check` passes.
- [x] `pnpm test` passes.
- [x] `arc42 validate --dir examples/bookstore-backend` exits 0.
- [x] `examples/bookstore-backend-asciidoc` is the twelve-chapter AsciiDoc bookstore.
- [x] Commit subject: `feat: support AsciiDoc architecture documents`
- [x] Commit body lists parser, discovery, validate, get, init, explain, guide, diff, coverage, serve, and build.

### Entrance criteria

- [x] Every Code wave is checked.
- [x] Success criteria below are checked.

## Success criteria

### Read

- [x] Both parsers produce the same blocks, headings, diagrams, and ignores for equivalent content
- [x] The CLI selects the parser from the file extension
- [x] Mixed workspaces (`.arc42.md` and `.arc42.adoc`) load together
- [x] **25+ AsciiDoc parser unit tests** in `parser-asciidoc.test.ts`
- [x] **15+ cross-parser equivalence tests** in `parser-equivalence.test.ts`

### Validate

- [x] `arc42 validate` reports diagnostics for `.arc42.adoc` with path and line
- [x] `arc42 validate`, `arc42 get`, and `arc42 explain` still behave the same on Markdown workspaces
- [x] Chapter assignment (E016) and chapter titles (W015) work for `.arc42.adoc` filenames
- [x] W016 does not fire for `[arc42.<type>]`. W017 fires for a bare `[source,…]`

### Write

- [x] `arc42 get --format asciidoc` produces AsciiDoc for the workspace and for one element
- [x] Every element kind is rendered
- [x] Cross-references are preserved, and a missing reference does not throw
- [x] **29+ renderer unit tests** in `renderer-asciidoc.test.ts`
- [x] **5+ round-trip tests** in `renderer-asciidoc-roundtrip.test.ts`
- [x] Help text and the CLI README show the `asciidoc` format

### Init

- [x] `arc42 init --format asciidoc` writes twelve chapter files via `convertMarkdownToAsciiDoc`
- [x] That directory validates with exit 0
- [x] Existing files are not overwritten
- [x] Converter tests keep Mermaid arrows and reject chapter templates that leave the supported Markdown subset

### Every other command

- [x] `arc42 explain` shows Markdown and AsciiDoc syntax for blocks, diagrams, and ignore
- [x] `arc42 guide chapter <n> --format asciidoc` converts only the embedded starter; the surrounding prompt stays Markdown
- [x] `arc42 rules` describes the AsciiDoc form of W016 and W017
- [x] `arc42 diff` includes `.arc42.adoc` changes
- [x] `arc42 coverage` claims paths declared in AsciiDoc elements
- [x] `arc42 serve` reloads on `.arc42.adoc` edits
- [x] `arc42 build` publishes an AsciiDoc workspace
- [x] The skill workflow documents both suffixes

### Regressions

- [x] Existing tests pass, except assertions that the only architecture suffix is `.arc42.md`
- [x] `arc42 validate --dir examples/bookstore-backend` still succeeds
- [x] `pnpm run check` and `pnpm test` pass
