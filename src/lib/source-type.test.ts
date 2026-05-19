import { describe, it, expect } from "vitest"
import { detectSourceType } from "./source-type"

describe("detectSourceType", () => {
  it("detects regulation", () => {
    expect(detectSourceType("raw/sources/regulation/primary/act.pdf")).toBe("regulation")
    expect(detectSourceType("raw/sources/regulation/secondary/act-ja.pdf")).toBe("regulation")
  })
  it("detects compliance-docs", () => {
    expect(detectSourceType("raw/sources/compliance-docs/risk/v2.pdf")).toBe("compliance-docs")
  })
  it("detects external", () => {
    expect(detectSourceType("raw/sources/external/guidelines/guide.pdf")).toBe("external")
  })
  it("returns general for unknown", () => {
    expect(detectSourceType("raw/sources/random.pdf")).toBe("general")
  })
  it("handles absolute paths", () => {
    expect(detectSourceType("/home/proj/raw/sources/regulation/primary/x.pdf")).toBe("regulation")
  })
  it("handles paths without raw/sources prefix", () => {
    expect(detectSourceType("docs/notes.md")).toBe("general")
  })
})
