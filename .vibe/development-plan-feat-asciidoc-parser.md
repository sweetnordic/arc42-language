# Development Plan: arc42-language (feat/asciidoc-parser + Phase 2: asciidoc-writer)

*Generated on 2026-09-22 by Kiro*  
*Updated on 2026-09-22 for Phase 2: AsciiDoc Writer*  
*Workflow: Feature Implementation with Testing*

## Goal

**Phase 1 (Complete ✅):** Implement a parallel AsciiDoc parser for arc42 documentation alongside the existing Markdown parser, enabling users to **read** architecture documentation in AsciiDoc (`.adoc`/`.asciidoc` files) with full feature parity to Markdown.

**Phase 2 (New):** Implement AsciiDoc output renderer enabling users to **write** architecture documentation in AsciiDoc format with full feature parity to other output formats.

### Combined Goals

The complete implementation (Phase 1 + 2) enables:

- ✅ **Read** AsciiDoc files (Phase 1 - Complete)
- ✅ **Parse** AsciiDoc block syntax and auto-detect format (Phase 1 - Complete)
- ✅ **Validate** AsciiDoc content with linting (Phase 1 - Complete)
- ✅ **Convert** JSON/internal model to AsciiDoc output (Phase 2 - New)
- ✅ **Support mixed-format workspaces** (Phase 1 - Complete)
- ✅ **Round-trip validation** (read → write → read equivalence) (Phase 2 - New)
- ✅ **Full CLI support** for both reading and writing (Phase 1 + 2)

## Key Decisions

### Phase 1 (Parser) - COMPLETED ✅

- **Parser abstraction first** — Create a `Parser` interface and registry in `packages/core/src/parser/` before implementing AsciiDoc, so the core pipeline remains format-agnostic.
- **Line-oriented parsing** — AsciiDoc parser follows the same line-by-line strategy as Markdown, avoiding complex AST manipulation. Delimited blocks are recognized like Markdown fences.
- **Identical AST contract** — Both parsers produce identical `DocumentAst` structure. No format-specific nodes or attributes. The builder, validator, and renderers never know which parser created the AST.
- **Auto-detection by file extension** — `.arc42.md` → Markdown parser, `.arc42.adoc` / `.arc42.asciidoc` → AsciiDoc parser. No format parameter needed for most CLI operations.
- **Core pipeline unchanged** — Parser registry is internal to `packages/core`. The CLI and public API remain stable; only `discoverFiles` + `parseArchitectureDocument` logic changes.
- **AsciiDoc block syntax** — Blocks are delimited with `[arc42.block-type]` header and `----` fences (four or more dashes), following standard AsciiDoc delimited-block convention. Attributes use `key: value` (same as Markdown).
- **Comments in AsciiDoc** — AsciiDoc line comments (`//`) and block comments (`////...////`) are stripped before parsing, mirroring Markdown HTML-comment handling.
- **Diagram and ignore directives** — AsciiDoc preserves these first-class: `:::diagram` and `:::ignore` inside delimited blocks are recognized identically to Markdown arc42 fences.
- **Test-driven implementation** — Every feature is tested before code. Parser unit tests, equivalence tests, and integration tests run continuously.

### Phase 2 (Writer) - NEW

- **Renderer abstraction** — Leverage existing `WorkspaceRenderer` interface to add AsciiDoc output alongside JSON, Text, HTML formats.
- **Full element coverage** — Support all element types (QualityGoal, Constraint, BuildingBlock, Interface, Concept, Decision, Risk, GlossaryTerm, RuntimeScenario, DeploymentNode).
- **Reference preservation** — Maintain all cross-references and connections in output format.
- **Round-trip validation** — Ensure content written in AsciiDoc can be read back with semantic equivalence (no information loss).
- **CLI integration** — Support `--format asciidoc` flag in `arc42 get` command for seamless output format selection.
- **Consistent formatting** — Follow AsciiDoc conventions and maintain consistency with parsed AsciiDoc structure.

## Notes

### Phase 1 Status: ✅ COMPLETE

All Phase 1 (Parser) tasks are complete:
- [x] Parser abstraction implemented (types.ts, index.ts)
- [x] AsciiDoc parser implemented (asciidoc-parser.ts)
- [x] 15+ AsciiDoc unit tests (PASSING)
- [x] 9+ equivalence tests (PASSING)
- [x] 22+ linter integration tests (BONUS - PASSING)
- [x] BDD test refactoring (BONUS - PASSING)
- [x] Full test suite: 403/403 tests passing
- [x] Type checking: PASS
- [x] Linting: PASS
- [x] Ready to merge to main branch

### Phase 2 Status: 🎯 NEW (Not Started)

Phase 2 tasks are defined below and ready for implementation planning.

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

- [x] Review `parser.test.ts` and understand the test structure and helper functions
- [x] Review `markdown-parser.ts` and understand the line-oriented parsing strategy
- [x] Review AsciiDoc syntax for delimited blocks and comments
- [x] Identify all places where `parseMarkdown` is called (parser registry insertion points)
- [x] Verify that `DocumentAst` output is truly format-independent

### Entrance criteria

- The line-oriented parsing strategy in Markdown is understood
- AsciiDoc block and comment syntax is documented
- Test patterns are known and can be replicated

### Completed

- [x] Explored existing parser architecture
- [x] Understood line-oriented parsing strategy
- [x] Documented AsciiDoc syntax mapping
- [x] Identified integration points in arc42.ts and CLI

---

## Plan

### Tasks

- [x] Define the `Parser` interface and `ParserRegistry` contract
- [x] Plan parser auto-detection logic (by file extension)
- [x] Plan test structure: unit tests (parser-asciidoc.test.ts) + equivalence tests (parser-equivalence.test.ts)
- [x] Verify entry points: `arc42.ts` + CLI `discoverFiles` logic
- [x] Define AsciiDoc block and comment grammar for implementation
- [x] Plan refactoring of existing `parseMarkdown` export to use registry

### Entrance criteria

- Parser abstraction is designed and approved
- Test plan is reviewed
- AsciiDoc grammar is defined

### Completed

- [x] Parser abstraction designed
- [x] Test plan documented  
- [x] AsciiDoc syntax mapped to Markdown equivalent
- [x] Integration points identified

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

## Follow-up: Phase 2 (AsciiDoc Output Renderer)

### AsciiDoc Output Renderer Implementation

**Goal:** Enable users to output arc42 documentation in AsciiDoc format with full feature parity to Markdown output.

#### Tasks

- [ ] **Create AsciiDoc renderer** (`packages/core/src/renderer/asciidoc-writer.ts`)
  - Implement `AsciiDocRenderer` class implementing `WorkspaceRenderer` interface
  - Convert `Workspace` model to AsciiDoc string output
  - Handle all element types: QualityGoal, Constraint, BuildingBlock, Interface, Concept, Decision, Risk, GlossaryTerm, etc.
  - Preserve element ordering and relationships

- [ ] **Element renderers for each type**
  - `renderQualityGoal()` — `[arc42.quality-goal]` blocks with priority, category
  - `renderConstraint()` — `[arc42.constraint]` blocks with type
  - `renderBuildingBlock()` — `[arc42.building-block]` blocks with responsibility, connections
  - `renderInterface()` — `[arc42.interface]` blocks with connections to building blocks
  - `renderConcept()` — `[arc42.concept]` blocks
  - `renderDecision()` — `[arc42.decision]` blocks with status
  - `renderRisk()` — `[arc42.risk]` blocks with probability, impact
  - `renderGlossaryTerm()` — `[arc42.glossary-term]` blocks with definitions
  - `renderRuntimeScenario()` — `[arc42.runtime-scenario]` blocks with step sequence
  - `renderDeploymentNode()` — `[arc42.deployment-node]` blocks with infrastructure info

- [ ] **Cross-reference handling**
  - Preserve connection references between elements (e.g., interface → building block)
  - Render references as inline text: `see <<id,Text>>`
  - Handle missing references gracefully (document-local links)

- [ ] **Attribute rendering**
  - Map element fields to `key: value` pairs in block content
  - Handle lists: multi-value attributes (e.g., multiple qualities, concerns)
  - Format dates and enums consistently

- [ ] **Diagram and ignore directive support**
  - Preserve `:::diagram` directives with notation and content
  - Preserve `:::ignore` directives with rule codes and explanations

- [ ] **Register renderer in CLI**
  - Update renderer registry to include AsciiDocRenderer
  - Support `--format asciidoc` flag in `arc42 get` command

#### Verification

- `vp check` passes (types, lint)
- `arc42 get --format asciidoc` produces valid AsciiDoc output
- Round-trip validation: read → write → read produces equivalent workspace
- Manual inspection: output is readable and properly formatted
- All element types rendered correctly

---

### AsciiDoc Writer Unit Tests

**File:** `packages/core/tests/renderer-asciidoc.test.ts`

#### Test Structure

- **Basic rendering (5 tests)**
  - Empty workspace renders valid AsciiDoc header
  - Single quality goal renders correctly
  - Single building block renders correctly
  - Multiple elements render in order
  - Unknown element type handled gracefully

- **Element type coverage (12 tests)**
  - QualityGoal with priority and category
  - Constraint with type field
  - BuildingBlock with responsibility and connections
  - Interface with connected building blocks
  - Concept with description
  - Decision with status (proposed, accepted, deprecated, superseded)
  - Risk with probability and impact
  - GlossaryTerm with definition
  - RuntimeScenario with step sequence
  - DeploymentNode with infrastructure details
  - Diagram block with mermaid notation
  - Ignore directive with rule code

- **Cross-reference handling (4 tests)**
  - Interface references correct building block
  - Missing reference handled without error
  - Bidirectional references rendered correctly
  - Circular references handled

- **Attribute rendering (5 tests)**
  - Simple string attributes rendered as `key: value`
  - List attributes rendered as multi-line or comma-separated
  - Empty/null attributes skipped
  - Special characters in attributes escaped properly
  - Dates formatted in ISO-8601 format

- **Formatting consistency (3 tests)**
  - Block content indentation consistent
  - Heading hierarchy matches element nesting
  - Blank lines separate major sections
  - Comments preserved where applicable

#### Test Pattern (BDD)

```typescript
describe("asciidoc renderer — quality goals", () => {
  test("When rendering a workspace with quality goals, Then output should contain arc42.quality-goal blocks", () => {
    // Given: Workspace with quality goals
    const workspace = buildWorkspace([...]);
    
    // When: Rendering to AsciiDoc
    const output = new AsciiDocRenderer().render(workspace);
    
    // Then: Output should contain quality goal blocks
    expect(output).toContain("[arc42.quality-goal]");
    expect(output).toContain("priority: 1");
    expect(output).toContain("category: Performance");
  });
});
```

---

### Round-Trip Testing

**File:** `packages/core/tests/renderer-asciidoc-roundtrip.test.ts`

Test that content written in AsciiDoc can be read back with semantic equivalence:

- [ ] **Read → Write → Read equivalence (5 tests)**
  - Markdown document → parse → write AsciiDoc → parse → workspace identical
  - AsciiDoc document → parse → write AsciiDoc → parse → workspace identical
  - JSON serialization of original and round-tripped workspaces match
  - Element count unchanged
  - Cross-references preserved

- [ ] **Format preservation (3 tests)**
  - Text content preserved (no information loss)
  - Attributes preserved (all key-value pairs intact)
  - Relationships preserved (connections remain correct)
  - Formatting may normalize but semantics unchanged

---

### CLI Integration

**Update:** `packages/cli/src/...`

- [ ] **Add `--format asciidoc` flag to `arc42 get`**
  - Default format remains text
  - Support: `arc42 get --format asciidoc > architecture.arc42.adoc`
  - Support: `arc42 get --id bb-1 --format asciidoc` (single element in AsciiDoc)

- [ ] **Update help text**
  - Document new `--format asciidoc` option
  - Provide examples in documentation

---

### Documentation Updates

- [ ] **Add to CLI help**
  - Explain output formats: text, json, asciidoc, html
  - Provide usage examples

- [ ] **Add to README**
  - Document bidirectional support
  - Example: read Markdown, write AsciiDoc

- [ ] **Create migration guide** (optional)
  - How to convert existing Markdown docs to AsciiDoc
  - Command examples

---

### Entrance Criteria (Ready to implement Phase 2)

- [x] Phase 1 complete and all tests passing
- [ ] Renderer architecture understood
- [ ] AsciiDoc output format defined
- [ ] Test patterns established
- [ ] Element type mapping documented

### Success Criteria (Phase 2)

1. ✅ `arc42 get --format asciidoc` produces valid AsciiDoc
2. ✅ All element types rendered correctly
3. ✅ Cross-references preserved in output
4. ✅ Round-trip validation passes (read → write → read)
5. ✅ 29+ renderer unit tests
6. ✅ 5+ round-trip equivalence tests
7. ✅ Output is readable and properly formatted
8. ✅ No regressions in existing functionality
9. ✅ CLI fully integrated with format support
10. ✅ Documentation updated with examples

---

## Follow-up: Phase 3 (Optional Future Enhancements)

### Optional: Bidirectional Conversion

- [ ] Add `arc42 convert --from markdown --to asciidoc` command
- [ ] Add `arc42 convert --from asciidoc --to markdown` command
- [ ] Conversion preserves all metadata; prose formatting may normalize

### Optional: Language Server Support

- [ ] Extend LSP to recognize `.arc42.adoc` files with full support
- [ ] LSP diagnostics and hover work on both formats
- [ ] Syntax highlighting for AsciiDoc blocks

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
