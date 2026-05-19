import { describe, it, expect } from "vitest"
import { deriveStatus } from "./status-derivation"
import type { ComplianceExtendedStatus } from "./schema-loader"

const noExt: ComplianceExtendedStatus[] = []
const blocked: ComplianceExtendedStatus[] = [{ value: "blocked", mapsToBase: "partial" }]

describe("deriveStatus", () => {
  it("all compliant → compliant", () => {
    expect(deriveStatus({ a: "compliant", b: "compliant" }, noExt)).toBe("compliant")
  })
  it("compliant + not-applicable → compliant", () => {
    expect(deriveStatus({ a: "compliant", b: "not-applicable" }, noExt)).toBe("compliant")
  })
  it("all not-applicable → not-applicable", () => {
    expect(deriveStatus({ a: "not-applicable", b: "not-applicable" }, noExt)).toBe("not-applicable")
  })
  it("all non-compliant → non-compliant", () => {
    expect(deriveStatus({ a: "non-compliant", b: "non-compliant" }, noExt)).toBe("non-compliant")
  })
  it("mixed → partial", () => {
    expect(deriveStatus({ a: "compliant", b: "non-compliant" }, noExt)).toBe("partial")
  })
  it("blocked maps to partial", () => {
    expect(deriveStatus({ a: "compliant", b: "blocked" }, blocked)).toBe("partial")
  })
  it("all blocked → partial", () => {
    expect(deriveStatus({ a: "blocked", b: "blocked" }, blocked)).toBe("partial")
  })
  it("empty → non-compliant", () => {
    expect(deriveStatus({}, noExt)).toBe("non-compliant")
  })
  it("unknown status → treated as non-compliant", () => {
    expect(deriveStatus({ a: "xyz" }, noExt)).toBe("non-compliant")
  })
  it("single compliant → compliant", () => {
    expect(deriveStatus({ a: "compliant" }, noExt)).toBe("compliant")
  })
  it("single not-applicable → not-applicable", () => {
    expect(deriveStatus({ a: "not-applicable" }, noExt)).toBe("not-applicable")
  })
})
