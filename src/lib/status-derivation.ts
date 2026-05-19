import type { ComplianceExtendedStatus } from "./schema-loader"

type BaseStatus = "compliant" | "partial" | "non-compliant" | "not-applicable"

const VALID: Set<string> = new Set(["compliant", "partial", "non-compliant", "not-applicable"])

export function deriveStatus(
  itemStatuses: Record<string, string>,
  complianceExtended: ComplianceExtendedStatus[],
): BaseStatus {
  const vals = Object.values(itemStatuses)
  if (vals.length === 0) return "non-compliant"

  const extMap = new Map(complianceExtended.map((e) => [e.value, e.mapsToBase]))
  const normalized = vals.map((s): BaseStatus => {
    if (VALID.has(s)) return s as BaseStatus
    const mapped = extMap.get(s)
    return mapped && VALID.has(mapped) ? (mapped as BaseStatus) : "non-compliant"
  })

  if (normalized.every((s) => s === "not-applicable")) return "not-applicable"
  if (normalized.every((s) => s === "compliant" || s === "not-applicable")) return "compliant"
  if (normalized.every((s) => s === "non-compliant")) return "non-compliant"
  return "partial"
}
