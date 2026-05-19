import { parseFrontmatter } from "./frontmatter"
import { deriveStatus } from "./status-derivation"
import type { ComplianceExtendedStatus } from "./schema-loader"
import yaml from "js-yaml"

export function applyStatusDerivation(
  content: string,
  complianceExtended: ComplianceExtendedStatus[],
): string {
  const { frontmatter, body, rawBlock } = parseFrontmatter(content)
  if (!frontmatter || frontmatter.type !== "compliance") return content

  const items = extractItemStatuses(rawBlock)
  if (!items || Object.keys(items).length === 0) return content

  const derived = deriveStatus(items, complianceExtended)
  const hasStatus = /^status:\s*.+$/m.test(rawBlock)

  let newBlock: string
  if (hasStatus) {
    newBlock = rawBlock.replace(/^status:\s*.+$/m, `status: ${derived}`)
  } else {
    const closeIdx = rawBlock.lastIndexOf("---")
    newBlock = rawBlock.slice(0, closeIdx) + `status: ${derived}\n` + rawBlock.slice(closeIdx)
  }

  return newBlock + body
}

function extractItemStatuses(raw: string): Record<string, string> | null {
  try {
    const yml = raw.replace(/^---\s*\n/, "").replace(/\n---\s*$/, "").replace(/\n---\s*\n$/, "")
    const parsed = yaml.load(yml) as Record<string, unknown>
    if (parsed?.item_statuses && typeof parsed.item_statuses === "object") {
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed.item_statuses as Record<string, unknown>)) {
        if (typeof v === "string") result[k] = v
      }
      return Object.keys(result).length > 0 ? result : null
    }
  } catch { /* invalid YAML */ }
  return null
}
