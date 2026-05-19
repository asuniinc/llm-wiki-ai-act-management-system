import { readFile } from "@/commands/fs"
import { normalizePath } from "@/lib/path-utils"

export interface ComplianceExtendedStatus {
  value: string
  mapsToBase: string
}

export interface FrameworkConfig {
  sourceLanguages: { primary: string; secondary: string[] }
  complianceExtended: ComplianceExtendedStatus[]
  ingestOverrides: Record<string, string>
}

export function mergeSchema(common: string, framework: string | null): string {
  if (!framework) return common
  return `${common}\n\n---\n\n${framework}`
}

export function parseFrameworkConfig(framework: string): FrameworkConfig {
  const config: FrameworkConfig = {
    sourceLanguages: { primary: "en", secondary: [] },
    complianceExtended: [],
    ingestOverrides: {},
  }
  if (!framework) return config

  parseSourceLanguages(framework, config)
  parseComplianceExtended(framework, config)
  parseIngestOverrides(framework, config)

  return config
}

function parseSourceLanguages(md: string, config: FrameworkConfig): void {
  const section = extractSection(md, "Source Languages")
  if (!section) return

  const code = extractCodeBlock(section)
  if (!code) return

  const pm = code.match(/primary:\s*"?(\w+)"?/)
  if (pm) config.sourceLanguages.primary = pm[1]

  const sm = code.match(/secondary:\s*\[([^\]]*)\]/)
  if (sm) {
    config.sourceLanguages.secondary = sm[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean)
  }
}

function parseComplianceExtended(md: string, config: FrameworkConfig): void {
  const section = extractSection(md, "compliance_extended")
  if (!section) return

  const code = extractCodeBlock(section)
  if (!code) return

  const re = /- value:\s*(\S+)\s*\n\s*maps_to_base:\s*(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    config.complianceExtended.push({ value: m[1], mapsToBase: m[2] })
  }
}

function parseIngestOverrides(md: string, config: FrameworkConfig): void {
  const section = extractSection(md, "Ingest Overrides")
  if (!section) return

  const subsections = section.split(/^###\s+/m).filter(Boolean)
  for (const sub of subsections) {
    const hdr = sub.match(/^(\S+)/)
    if (!hdr) continue
    const key = hdr[1].replace(/\/$/, "")
    const code = extractCodeBlock(sub)
    if (code) config.ingestOverrides[key] = code
  }
}

function extractSection(md: string, heading: string): string | null {
  const lines = md.split("\n")
  const target = heading.toLowerCase()
  let capturing = false
  let level = 0
  const result: string[] = []

  for (const line of lines) {
    const hm = line.match(/^(#{2,3})\s+(.*)/)
    if (hm) {
      if (capturing) {
        if (hm[1].length <= level) break
      }
      if (hm[2].trim().toLowerCase().startsWith(target)) {
        capturing = true
        level = hm[1].length
        continue
      }
    }
    if (capturing) result.push(line)
  }

  const text = result.join("\n").trim()
  return text || null
}

function extractCodeBlock(section: string): string | null {
  const m = section.match(/```(?:\w*)\n([\s\S]*?)```/)
  return m ? m[1].trim() : null
}

async function tryRead(path: string): Promise<string> {
  try {
    return await readFile(path)
  } catch {
    return ""
  }
}

export async function loadSchema(
  projectPath: string,
): Promise<{ merged: string; frameworkConfig: FrameworkConfig }> {
  const pp = normalizePath(projectPath)
  const [common, framework] = await Promise.all([
    tryRead(`${pp}/schema/common.md`),
    tryRead(`${pp}/schema/framework.md`),
  ])
  return {
    merged: mergeSchema(common || "", framework),
    frameworkConfig: parseFrameworkConfig(framework || ""),
  }
}
