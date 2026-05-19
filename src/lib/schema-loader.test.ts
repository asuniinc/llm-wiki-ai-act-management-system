import { describe, it, expect } from "vitest"
import { mergeSchema, parseFrameworkConfig } from "./schema-loader"

describe("mergeSchema", () => {
  it("concatenates common and framework with separator", () => {
    const result = mergeSchema("# Common", "# Framework")
    expect(result).toContain("Common")
    expect(result).toContain("Framework")
    expect(result).toContain("---")
  })

  it("returns common only when framework is empty", () => {
    expect(mergeSchema("# Common", "")).toBe("# Common")
  })

  it("returns common only when framework is null", () => {
    expect(mergeSchema("# Common", null)).toBe("# Common")
  })
})

describe("parseFrameworkConfig", () => {
  const FULL_FRAMEWORK = `# EU AI Act — Framework Schema

## Source Languages

\`\`\`yaml
source_languages:
  primary: "en"
  secondary: ["ja"]
\`\`\`

## Custom Status Models

### compliance_extended

\`\`\`yaml
compliance_extended:
  - value: blocked
    maps_to_base: partial
\`\`\`

## Ingest Overrides

### regulation

\`\`\`
EU AI Act の条文を読み、条・項単位で以下を抽出せよ：
- 義務の主体（provider / deployer / importer 等）
\`\`\`

### external

\`\`\`
この文書のEU公式ステータスを判定し、
既存の requirement / compliance ページへの影響を評価せよ。
\`\`\`
`

  it("extracts compliance_extended with maps_to_base", () => {
    const config = parseFrameworkConfig(FULL_FRAMEWORK)
    expect(config.complianceExtended).toEqual([
      { value: "blocked", mapsToBase: "partial" },
    ])
  })

  it("extracts source languages", () => {
    const config = parseFrameworkConfig(FULL_FRAMEWORK)
    expect(config.sourceLanguages.primary).toBe("en")
    expect(config.sourceLanguages.secondary).toEqual(["ja"])
  })

  it("extracts ingest overrides", () => {
    const config = parseFrameworkConfig(FULL_FRAMEWORK)
    expect(config.ingestOverrides["regulation"]).toContain("義務の主体")
    expect(config.ingestOverrides["external"]).toContain("公式ステータス")
  })

  it("returns defaults for empty input", () => {
    const config = parseFrameworkConfig("")
    expect(config.complianceExtended).toEqual([])
    expect(config.sourceLanguages).toEqual({ primary: "en", secondary: [] })
    expect(config.ingestOverrides).toEqual({})
  })

  it("handles multiple compliance_extended entries", () => {
    const fw = `## Custom Status Models

### compliance_extended

\`\`\`yaml
compliance_extended:
  - value: blocked
    maps_to_base: partial
  - value: deferred
    maps_to_base: non-compliant
\`\`\`
`
    const config = parseFrameworkConfig(fw)
    expect(config.complianceExtended).toEqual([
      { value: "blocked", mapsToBase: "partial" },
      { value: "deferred", mapsToBase: "non-compliant" },
    ])
  })

  it("handles multiple secondary languages", () => {
    const fw = `## Source Languages

\`\`\`yaml
source_languages:
  primary: "ja"
  secondary: ["en", "de"]
\`\`\`
`
    const config = parseFrameworkConfig(fw)
    expect(config.sourceLanguages.primary).toBe("ja")
    expect(config.sourceLanguages.secondary).toEqual(["en", "de"])
  })
})
