import { describe, it, expect } from "vitest"
import { applyStatusDerivation } from "./compliance-post-ingest"
import type { ComplianceExtendedStatus } from "./schema-loader"

const ext: ComplianceExtendedStatus[] = [{ value: "blocked", mapsToBase: "partial" }]

describe("applyStatusDerivation", () => {
  it("sets status from item_statuses", () => {
    const content = `---
type: compliance
maps_to: a9
item_statuses:
  "9(2)": compliant
  "9(5)": non-compliant
---

# Page`
    const result = applyStatusDerivation(content, ext)
    expect(result).toContain("status: partial")
  })

  it("overwrites existing status", () => {
    const content = `---
type: compliance
status: compliant
item_statuses:
  "9(2)": non-compliant
---

# Page`
    const result = applyStatusDerivation(content, ext)
    expect(result).toContain("status: non-compliant")
    expect(result).not.toMatch(/status: compliant/)
  })

  it("handles blocked status via maps_to_base", () => {
    const content = `---
type: compliance
maps_to: a9
item_statuses:
  "9(2)": compliant
  "9(8)": blocked
---

# Page`
    const result = applyStatusDerivation(content, ext)
    expect(result).toContain("status: partial")
  })

  it("ignores non-compliance pages", () => {
    const content = `---
type: requirement
id: a9
---

# Req`
    expect(applyStatusDerivation(content, ext)).toBe(content)
  })

  it("ignores pages without item_statuses", () => {
    const content = `---
type: compliance
maps_to: a9
---

# Page`
    expect(applyStatusDerivation(content, ext)).toBe(content)
  })

  it("preserves body content", () => {
    const content = `---
type: compliance
maps_to: a9
item_statuses:
  "9(2)": compliant
---

# Page

Some detailed body content here.`
    const result = applyStatusDerivation(content, ext)
    expect(result).toContain("# Page")
    expect(result).toContain("Some detailed body content here.")
    expect(result).toContain("status: compliant")
  })
})
