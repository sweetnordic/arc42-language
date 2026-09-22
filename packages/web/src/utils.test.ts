import { describe, expect, test } from "vite-plus/test";
import { basename } from "./utils.ts";

describe("web basename", () => {
  test("strips .arc42.adoc", () => {
    expect(basename("05-building-blocks.arc42.adoc")).toBe("05-building-blocks");
  });

  test("strips .arc42.md", () => {
    expect(basename("05-building-blocks.arc42.md")).toBe("05-building-blocks");
  });
});
