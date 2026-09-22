import type { GetRenderer } from "@arc42/core";
import { TextGetRenderer } from "./text.ts";
import { JsonGetRenderer } from "./json.ts";
import { MarkdownGetRenderer } from "./markdown.ts";
import { AsciiDocGetRenderer } from "./asciidoc.ts";

const textRenderer = new TextGetRenderer();
const jsonRenderer = new JsonGetRenderer();
const markdownRenderer = new MarkdownGetRenderer();
const asciidocRenderer = new AsciiDocGetRenderer();

export const builtinGetRenderers: readonly GetRenderer[] = [
  textRenderer,
  jsonRenderer,
  markdownRenderer,
  asciidocRenderer,
];
export const rendererById: ReadonlyMap<string, GetRenderer> = new Map(
  builtinGetRenderers.map((r) => [r.meta.id, r]),
);
