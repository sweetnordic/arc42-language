# Development Plan: arc42-language (feat/asciidoc-parser branch)

*Generated on 2026-09-22 by Kiro*  
*Workflow: Feature Implementation with Testing*

## Goal

Implement a parallel AsciiDoc parser for arc42 documentation alongside the existing Markdown parser, enabling users to write architecture documentation in AsciiDoc (`.adoc`/`.asciidoc` files) with full feature parity to Markdown. The implementation must:

- Parse AsciiDoc block syntax (delimited blocks with `[arc42.block-type]` and `----` delimiters)
- Produce identical `DocumentAst` output regardless of input format
- Support mixed-format workspaces (some files `.arc42.md`, some files `.arc42.adoc`)
- Maintain all validation rules, renderers, and CLI commands unchanged
- Be thoroughly tested with equivalence tests ensuring both parsers produce identical results

## Key Decisions

- **Parser abstraction first** — Create a `Parser` interface and registry in `packages/core/src/parser/` before implementing AsciiDoc, so the core pipeline remains format-agnostic.
- **Line-oriented parsing** — AsciiDoc parser follows the same line-by-line strategy as Markdown, avoiding complex AST manipulation. Delimited blocks are recognized like Markdown fences.
- **Identical AST contract** — Both parsers produce identical `DocumentAst` structure. No format-specific nodes or attributes. The builder, validator, and renderers never know which parser created the AST.
- **Auto-detection by file extension** — `.arc42.md` → Markdown parser, `.arc42.adoc` / `.arc42.asciidoc` → AsciiDoc parser. No format parameter needed for most CLI operations.
- **Core pipeline unchanged** — Parser registry is internal to `packages/core`. The CLI and public API remain stable; only `discoverFiles` + `parseArchitectureDocument` logic changes.
- **AsciiDoc block syntax** — Blocks are delimited with `[arc42.block-type]` header and `----` fences (four or more dashes), following standard AsciiDoc delimited-block convention. Attributes use `key: value` (same as Markdown).
- **Comments in AsciiDoc** — AsciiDoc line comments (`//`) and block comments (`////...////`) are stripped before parsing, mirroring Markdown HTML-comment handling.
- **Diagram and ignore directives** — AsciiDoc preserves these first-class: `:::diagram` and `:::ignore` inside delimited blocks are recognized identically to Markdown arc42 fences.
- **No output formatter yet** — Phase 1 focuses on reading AsciiDoc. Writing AsciiDoc output (`arc42 get --format asciidoc`) deferred to Phase 2.
- **Test-driven implementation** — Every feature is tested before code. Parser unit tests, equivalence tests, and integration tests run continuously.

## Notes

### AsciiDoc vs. Markdown syntax mapping

| Element | Markdown | AsciiDoc |
|---------|----------|----------|
| Heading | `## Title` | `== Title` |
| Prose | Any text | Any text |
| Block | `:::type` ... `:::` | `[arc42.type]` ... `----` |
| Fence | ` ```arc42 ` ... ` ``` ` | `[arc42]` ... `----` (optional, blocks work standalone) |
| Comment (line) | `<!-- -->` | `//` |
| Comment (block) | `<!-- ... -->` | `////...////` |
| Diagram | `:::diagram` in arc42 fence | `:::diagram` in [arc42] block |
| Ignore | `:::ignore RULE` in arc42 fence | `:::ignore RULE` in [arc42] block |

### Parser registry placement

The registry lives in `packages/core/src/parser/`:
```
packages/core/src/parser/
├── markdown-parser.ts      (existing)
├── asciidoc-parser.ts      (new)
├── types.ts                (new, Parser interface)
└── index.ts                (new, registry)
```

The `parseArchitectureDocument()` function in `arc42.ts` will become format-aware:
```typescript
export function parseArchitectureDocument(
  filePath: string,
  content: string,
  format?: 'markdown' | 'asciidoc'
): DocumentAst {
  // Auto-detect if format not provided
  if (!format) format = detectFormat(filePath);
  const parser = parserRegistry.get(format);
  return parser.parse(filePath, content);
}
```

### Test structure

- **`packages/core/tests/parser-asciidoc.test.ts`** — Unit tests for AsciiDoc parser (mirror of `parser.test.ts`)
- **`packages/core/tests/parser-equivalence.test.ts`** — Cross-parser validation tests
- **Existing validator/builder tests** — Auto-inherit AsciiDoc support via parser registry

### CLI detection logic

File discovery in the CLI will auto-select parser:
```typescript
function getParserFormat(filePath: string): 'markdown' | 'asciidoc' {
  if (filePath.endsWith('.adoc') || filePath.endsWith('.asciidoc')) {
    return 'asciidoc';
  }
  return 'markdown';
}
```

This ensures `arc42 validate --dir ./docs` works on mixed `.md` and `.adoc` files automatically.

---

## Explore

### Tasks

- [ ] Review `parser.test.ts` and understand the test structure and helper functions
- [ ] Review `markdown-parser.ts` and understand the line-oriented parsing strategy
- [ ] Review AsciiDoc syntax for delimited blocks and comments
- [ ] Identify all places where `parseMarkdown` is called (parser registry insertion points)
- [ ] Verify that `DocumentAst` output is truly format-independent

### Entrance criteria

- The line-oriented parsing strategy in Markdown is understood
- AsciiDoc block and comment syntax is documented
- Test patterns are known and can be replicated

### Completed

---

## Plan

### Tasks

- [ ] Define the `Parser` interface and `ParserRegistry` contract
- [ ] Plan parser auto-detection logic (by file extension)
- [ ] Plan test structure: unit tests (parser-asciidoc.test.ts) + equivalence tests (parser-equivalence.test.ts)
- [ ] Verify entry points: `arc42.ts` + CLI `discoverFiles` logic
- [ ] Define AsciiDoc block and comment grammar for implementation
- [ ] Plan refactoring of existing `parseMarkdown` export to use registry

### Entrance criteria

- Parser abstraction is designed and approved
- Test plan is reviewed
- AsciiDoc grammar is defined

### Completed

---

## Code

### Phase 1: Parser Abstraction

#### Tasks

- [ ] **Create parser types** (`packages/core/src/parser/types.ts`)
  - Define `Parser` interface: `parse(filePath, content): DocumentAst`
  - Define `ParserType = 'markdown' | 'asciidoc'`
  - Define `ParserRegistry` interface

- [ ] **Create parser registry** (`packages/core/src/parser/index.ts`)
  - Implement `DefaultParserRegistry` class
  - Register `MarkdownParser` and `AsciiDocParser` by type
  - Export singleton `parserRegistry`

- [ ] **Refactor `MarkdownParser`** to explicitly implement `Parser`
  - Ensure existing `parseMarkdown()` function is still exported
  - Update `MarkdownParser` class to delegate to `parseMarkdown()`
  - No behavioral changes; CI passes

- [ ] **Update `arc42.ts`** to use registry
  - Add `format?: 'markdown' | 'asciidoc'` parameter to `parseArchitectureDocument()`
  - Detect format from `filePath` if not provided (by extension)
  - Call `parserRegistry.get(format).parse()`

- [ ] **Update CLI discovery** (`packages/cli/src/...`)
  - Implement `detectFormat(filePath)` helper
  - Update `discoverFiles()` to pass format to `parseArchitectureDocument()`

#### Verification

- `vp check` passes (types, lint)
- Full test suite passes (no new tests yet, all existing tests use registry transparently)
- CLI `arc42 validate --dir examples/bookstore-backend` still works

### Phase 2: AsciiDoc Parser Implementation

#### Tasks

- [ ] **Create AsciiDoc parser** (`packages/core/src/parser/asciidoc-parser.ts`)
  - Implement `parseAsciiDoc(filePath, content): DocumentAst` function
  - Line-by-line parsing strategy (mirror Markdown)
  - Recognize `[arc42.block-type]` delimiters
  - Recognize `----` fences (4+ dashes)
  - Parse `key: value` attributes inside blocks
  - Handle AsciiDoc comments: `//` (line) and `////...////` (block)
  - Implement `AsciiDocParser` class with `Parser` interface

- [ ] **Parser detail: Headings**
  - Recognize `==`, `===`, etc. as AsciiDoc heading levels
  - Map to `HeadingNode` with correct `level` (1-based)

- [ ] **Parser detail: Blocks**
  - Recognize delimited-block syntax: `[arc42.type-name]` header followed by `----`
  - Parse key-value pairs (same format as Markdown)
  - Track `startLine`, `endLine`, attributes, and block type
  - Support `[arc42]` wrapper fence (optional, for consistency with Markdown ```arc42 ````)

- [ ] **Parser detail: Comments**
  - Strip `//` line comments before block parsing
  - Strip `////...////` block comments (multi-line)
  - Comments inside blocks are removed before attribute parsing

- [ ] **Parser detail: Diagrams and Ignore directives**
  - Recognize `:::diagram` and `:::ignore` inside [arc42] blocks
  - Parse as `DiagramNode` and `IgnoreNode` (same AST contract)

- [ ] **Register AsciiDoc parser**
  - Register `AsciiDocParser` in `parserRegistry`
  - Verify both parsers are discoverable

#### Verification

- `vp check` passes
- Parser unit tests pass (see Phase 3)
- Equivalence tests pass (see Phase 3)

### Phase 3: Testing

#### Tasks

- [ ] **Create AsciiDoc parser unit tests** (`packages/core/tests/parser-asciidoc.test.ts`)
  - Copy structure from `parser.test.ts`
  - Adapt all Markdown examples to AsciiDoc syntax
  - Test categories:
    - Basic structure (7 tests): blocks, headings, prose, blank lines, multiple blocks, unknown types
    - Comment handling (6 tests): line comments, block comments, headings in comments, prose in comments
    - Block syntax (10+ tests): `[arc42.type]` delimiters, line numbers, multiple blocks, diagram metadata
    - Ignore directives (3+ tests): valid directives, malformed directives
  - Use helper functions analogous to `blocks()`, `headings()`, `prose()`, `ignores()`

- [ ] **Create equivalence tests** (`packages/core/tests/parser-equivalence.test.ts`)
  - Test that identical logical content produces identical `DocumentAst`
  - Examples:
    - Simple quality goal block (Markdown vs AsciiDoc)
    - Building block with attributes
    - Multiple blocks with comments
    - Diagrams and ignore directives
  - ~15 equivalence tests total

- [ ] **Verify existing validator tests inherit AsciiDoc support**
  - Run full test suite; all validator/builder tests pass without modification
  - Spot-check that `validator-*.test.ts` files work with both formats (indirectly)

#### Verification

- `vp test` passes (all 50+ core tests, including new parser tests)
- Focused parser tests: `vp test parser` passes
- Focused equivalence tests: `vp test equivalence` passes
- `vp check` passes

---

## Commit

### Tasks

- [ ] Review diff: parser types + registry + AsciiDoc parser + tests
- [ ] Update this plan with completion status
- [ ] Create conventional commit:
  - **Subject**: `feat: add AsciiDoc parser with format auto-detection`
  - **Body**:
    ```
    - Add Parser interface and registry in packages/core/src/parser/
    - Implement AsciiDocParser with line-oriented parsing strategy
    - Auto-detect format by file extension (.arc42.md vs .arc42.adoc)
    - Add 25+ AsciiDoc unit tests (parser-asciidoc.test.ts)
    - Add 15+ equivalence tests (parser-equivalence.test.ts)
    - Parser registry is internal; public API unchanged
    - CLI `arc42 validate --dir ./docs` now supports mixed formats
    
    Tests: 300+ tests passing (50+ new parser tests)
    ```
- [ ] Push to `feat/asciidoc-parser` branch

### Entrance criteria

- All Code phase tasks completed
- All tests passing
- No regressions

### Verification before commit

- `pnpm run ready` passes (check + test + build)
- `arc42 validate --dir examples/bookstore-backend` works
- `arc42 validate --dir .` works (project's own arc42 docs)
- Manual test: create sample `.arc42.adoc` file and validate

---

## Follow-up: Phase 2 (Deferred)

### Optional: AsciiDoc Output Renderer

- [ ] Create `asciidoc-writer.ts` renderer for `arc42 get --format asciidoc`
- [ ] Round-trip validation: Markdown → JSON → AsciiDoc should be semantically equivalent
- [ ] Document limitations: original formatting may not be recoverable

### Optional: Bidirectional Conversion

- [ ] Add `arc42 convert --from markdown --to asciidoc` command
- [ ] Add `arc42 convert --from asciidoc --to markdown` command
- [ ] Conversion preserves all metadata; prose formatting may normalize

### Optional: Language Server Support

- [ ] Extend LSP to recognize `.arc42.adoc` files
- [ ] LSP diagnostics and hover work on both formats

---

## Entrance Criteria (Ready to implement)

- [x] Parser abstraction designed
- [x] Test plan documented
- [x] AsciiDoc syntax mapped
- [x] Integration points identified
- [x] Plan reviewed and approved

---

## Success Criteria

1. ✅ Both parsers produce identical `DocumentAst` for equivalent content
2. ✅ All existing tests pass without modification
3. ✅ CLI auto-detects format by file extension
4. ✅ Mixed-format workspaces (`.md` + `.adoc`) are supported
5. ✅ `arc42 validate`, `arc42 get`, `arc42 explain` work unchanged
6. ✅ 25+ AsciiDoc parser unit tests
7. ✅ 15+ cross-parser equivalence tests
8. ✅ Zero regressions in existing functionality
