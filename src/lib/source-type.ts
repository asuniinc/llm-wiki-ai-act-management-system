import { normalizePath } from "@/lib/path-utils"

export type SourceType = "regulation" | "compliance-docs" | "external" | "general"

const DIRS: [string, SourceType][] = [
  ["regulation/", "regulation"],
  ["compliance-docs/", "compliance-docs"],
  ["external/", "external"],
]

export function detectSourceType(sourcePath: string): SourceType {
  const norm = normalizePath(sourcePath).toLowerCase()
  const marker = "raw/sources/"
  const idx = norm.indexOf(marker)
  if (idx === -1) return "general"
  const after = norm.slice(idx + marker.length)
  for (const [dir, type] of DIRS) {
    if (after.startsWith(dir)) return type
  }
  return "general"
}
