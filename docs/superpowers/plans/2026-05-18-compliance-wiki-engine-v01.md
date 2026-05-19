# Compliance Wiki Engine v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nashsu/llm_wiki をフォークし、規制/規格の適合管理に特化した Compliance Wiki Engine の v0.1 を構築する。

**Architecture:** LLM Wiki の3層構造（Raw Sources → Wiki → Schema）をベースに、Schema を common.md（エンジン共通）+ framework.md（フレームワーク固有）に分割。インジェストパイプラインにソースタイプ判定を追加し、regulation / compliance-docs / external のそれぞれに異なるプロンプトを適用する。Compliance Page の item_statuses からページ全体の status をシステムが決定論的に導出する。

**Tech Stack:** Tauri v2 (Rust) + React 19 + TypeScript + Vite + shadcn/ui + OpenAI GPT-4o

**Spec:** `docs/superpowers/specs/2026-05-18-llm-wiki-compliance-engine-design.md`

---

## Codebase Key Files (from upstream nashsu/llm_wiki)

| File | Role | How We Modify |
|------|------|--------------|
| `src/lib/ingest.ts` | 2段階インジェスト (analysis → generation) | schema読み込み変更、ソースタイプ別プロンプト、post-ingestフック |
| `src/lib/ingest.ts:buildAnalysisPrompt()` | Step 1 プロンプト構築 | sourceType パラメータ追加 |
| `src/lib/ingest.ts:buildGenerationPrompt()` | Step 2 プロンプト構築（schema を含む） | requirement/compliance ページタイプ指示追加 |
| `src/lib/ingest.ts:autoIngestImpl()` L319 | `schema.md` を読む箇所 | `loadSchema()` に置換 |
| `src/lib/frontmatter.ts` | YAML frontmatter パース | 変更なし（そのまま利用） |
| `src/lib/source-lifecycle.ts` | ソースファイル管理・インジェストキュー | folderContext にソースタイプ情報を付加 |
| `src/lib/lint.ts` | 構造的 Lint (orphan, broken-link) | v0.1 では変更なし |
| `src/stores/review-store.ts` | Review Queue 状態管理 | 変更なし（そのまま利用） |

---

## File Map

### New Files

| Path | Responsibility |
|------|---------------|
| `schema/common.md` | エンジン共通 schema（ページタイプ、ステータスモデル、導出ルール） |
| `schema/framework.md` | AI Act 固有 schema（構造単位、カスタムステータス、インジェスト指示） |
| `purpose.md` | プロジェクト目的定義（AI Act 適合管理） |
| `src/lib/schema-loader.ts` | schema/ から common + framework を読み込みマージ |
| `src/lib/schema-loader.test.ts` | schema-loader テスト |
| `src/lib/source-type.ts` | ソースパス → ソースタイプ判定 |
| `src/lib/source-type.test.ts` | source-type テスト |
| `src/lib/status-derivation.ts` | item_statuses → status 決定論的導出 |
| `src/lib/status-derivation.test.ts` | status-derivation テスト |
| `src/lib/compliance-post-ingest.ts` | インジェスト後の status 導出・frontmatter 書き戻し |
| `src/lib/compliance-post-ingest.test.ts` | compliance-post-ingest テスト |

### Modified Files

| Path | Changes |
|------|---------|
| `src/lib/ingest.ts:autoIngestImpl()` L319-325 | schema 読み込みを `loadSchema()` に変更 |
| `src/lib/ingest.ts:buildAnalysisPrompt()` L978 | sourceType パラメータ追加、ソースタイプ別コンテキスト |
| `src/lib/ingest.ts:buildGenerationPrompt()` L1029 | sourceType パラメータ追加、requirement/compliance ページ生成指示 |
| `src/lib/ingest.ts` post-writeFileBlocks | compliance ページに対する status 導出フック追加 |

---

## Task 1: Fork and Repository Setup

**Files:**
- GitHub: nashsu/llm_wiki → asuni/llm-wiki-ai-act-management-system

- [ ] **Step 1: Fork the repository**

```bash
gh repo fork nashsu/llm_wiki --org asuni --fork-name llm-wiki-ai-act-management-system --clone
cd llm-wiki-ai-act-management-system
```

- [ ] **Step 2: Verify the build environment**

```bash
npm install
npm run check
npm run test
```

Expected: TypeScript check passes, all existing tests pass.

- [ ] **Step 3: Create compliance directory structure**

```bash
mkdir -p schema
mkdir -p raw/sources/regulation/primary
mkdir -p raw/sources/regulation/secondary
mkdir -p raw/sources/compliance-docs
mkdir -p raw/sources/external
```

- [ ] **Step 4: Remove default schema.md**

```bash
cp schema.md schema.md.bak
rm schema.md
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: fork setup with compliance directory structure"
```

---

## Task 2: Schema Files (common.md + framework.md + purpose.md)

**Files:**
- Create: `schema/common.md`
- Create: `schema/framework.md`
- Modify: `purpose.md`

- [ ] **Step 1: Write schema/common.md**

Full content in spec: `docs/superpowers/specs/2026-05-18-llm-wiki-compliance-engine-design.md` → "Schema Design → schema/common.md" section.

Key sections to include:
- Page Types table (requirement, compliance, overview)
- Naming Conventions
- Frontmatter templates for requirement and compliance pages
- Status Models (compliance: compliant/partial/non-compliant/not-applicable, document: missing/draft/review/approved/outdated)
- Status Derivation rules (the 4 rules with not-applicable priority)
- Ingest Instructions per source type (regulation, compliance-docs, external)
- Source Update Policy (regulation and compliance-docs)

- [ ] **Step 2: Write schema/framework.md**

Full content in spec → "Schema Design → schema/framework.md (AI Act)" section.

Key sections:
- name: EU AI Act, version, scope
- Structure Units (Article/Paragraph/Point/Annex)
- Source Languages (primary: en, secondary: ja)
- Custom Status Models (eu_preparation, compliance_extended with blocked → maps_to_base: partial)
- Page Type Extensions (requirement gets eu_preparation)
- Ingest Overrides for regulation/ and external/
- Terminology mapping

- [ ] **Step 3: Rewrite purpose.md**

```markdown
# Project Purpose — EU AI Act Compliance Management

## Goal

EU AI Act（高リスクAIシステム Chapter 3, Annex III (4) 雇用・労務）への
適合状況を構造的に管理し、必要な文書の洗い出しと対応状況の可視化を行う。

## Scope

- 対象規制: Regulation (EU) 2024/1689
- 対象カテゴリ: Annex III (4) — 雇用、労務管理
- 対象条文: 第6条以降（高リスクAIシステムの義務）

## How This Wiki Works

1. regulation/ に条文配置 → Requirement Pages 生成
2. compliance-docs/ に適合文書配置 → Compliance Pages 自動更新
3. external/ にガイダンス配置 → ステータス更新

## Users

- 開発チーム: 適合性の自己チェック
- 法務/コンプライアンスチーム: モニタリング・報告
```

- [ ] **Step 4: Commit**

```bash
git add schema/common.md schema/framework.md purpose.md
git commit -m "feat: add schema/ with common.md + framework.md for AI Act compliance"
```

---

## Task 3: Schema Loader Module

**Files:**
- Create: `src/lib/schema-loader.ts`
- Create: `src/lib/schema-loader.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/schema-loader.test.ts
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
  it("extracts compliance_extended with maps_to_base", () => {
    const fw = "## Custom Status Models\n\n### compliance_extended\n\n- `blocked` — desc → maps_to_base: `partial`\n"
    const config = parseFrameworkConfig(fw)
    expect(config.complianceExtended).toEqual([
      { value: "blocked", mapsToBase: "partial" },
    ])
  })

  it("extracts source languages", () => {
    const fw = "## Source Languages\n\n- primary: en\n- secondary: ja\n"
    const config = parseFrameworkConfig(fw)
    expect(config.sourceLanguages.primary).toBe("en")
    expect(config.sourceLanguages.secondary).toEqual(["ja"])
  })

  it("extracts ingest overrides", () => {
    const fw = "## Ingest Overrides\n\n### regulation/\n\nExtract reqs.\n\n### external/\n\nEval status.\n"
    const config = parseFrameworkConfig(fw)
    expect(config.ingestOverrides["regulation"]).toContain("Extract reqs")
    expect(config.ingestOverrides["external"]).toContain("Eval status")
  })

  it("returns defaults for empty input", () => {
    const config = parseFrameworkConfig("")
    expect(config.complianceExtended).toEqual([])
    expect(config.ingestOverrides).toEqual({})
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/schema-loader.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/schema-loader.ts
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

  const extSection = extractSection(framework, "compliance_extended")
  if (extSection) {
    const re = /`(\w[\w-]*)`.+?maps_to_base:\s*`(\w[\w-]*)`/g
    let m: RegExpExecArray | null
    while ((m = re.exec(extSection)) !== null) {
      config.complianceExtended.push({ value: m[1], mapsToBase: m[2] })
    }
  }

  const langSection = extractSection(framework, "Source Languages")
  if (langSection) {
    const pm = langSection.match(/primary:\s*(\w+)/)
    if (pm) config.sourceLanguages.primary = pm[1]
    const sm = langSection.match(/secondary:\s*(.+)/)
    if (sm) config.sourceLanguages.secondary = sm[1].split(",").map((s) => s.trim()).filter(Boolean)
  }

  const ingestSection = extractSection(framework, "Ingest Overrides")
  if (ingestSection) {
    for (const sub of ingestSection.split(/^###\s+/m).filter(Boolean)) {
      const hdr = sub.match(/^(\S+)/)
      if (hdr) {
        const key = hdr[1].replace(/\/$/, "")
        const body = sub.slice(sub.indexOf("\n") + 1).trim()
        if (body) config.ingestOverrides[key] = body
      }
    }
  }

  return config
}

function extractSection(md: string, heading: string): string | null {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`^#{2,3}\\s+${esc}\\s*$([\\s\\S]*?)(?=^#{2,3}\\s|$)`, "m")
  const m = md.match(re)
  return m ? m[1].trim() : null
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

async function tryRead(path: string): Promise<string | null> {
  try { return await readFile(path) } catch { return null }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/schema-loader.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema-loader.ts src/lib/schema-loader.test.ts
git commit -m "feat: add schema-loader for common.md + framework.md merge"
```

---

## Task 4: Source Type Detection

**Files:**
- Create: `src/lib/source-type.ts`
- Create: `src/lib/source-type.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/source-type.test.ts
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
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/source-type.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/source-type.ts
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
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/source-type.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/source-type.ts src/lib/source-type.test.ts
git commit -m "feat: add source type detection (regulation/compliance-docs/external)"
```

---

## Task 5: Status Derivation Module

**Files:**
- Create: `src/lib/status-derivation.ts`
- Create: `src/lib/status-derivation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/status-derivation.test.ts
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
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/status-derivation.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/status-derivation.ts
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
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/status-derivation.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/status-derivation.ts src/lib/status-derivation.test.ts
git commit -m "feat: deterministic status derivation from item_statuses"
```

---

## Task 6: Post-Ingest Status Derivation

**Files:**
- Create: `src/lib/compliance-post-ingest.ts`
- Create: `src/lib/compliance-post-ingest.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/compliance-post-ingest.test.ts
import { describe, it, expect } from "vitest"
import { applyStatusDerivation } from "./compliance-post-ingest"
import type { ComplianceExtendedStatus } from "./schema-loader"

const ext: ComplianceExtendedStatus[] = [{ value: "blocked", mapsToBase: "partial" }]

describe("applyStatusDerivation", () => {
  it("sets status from item_statuses", () => {
    const content = '---\ntype: compliance\nmaps_to: a9\nitem_statuses:\n  "9(2)": compliant\n  "9(5)": non-compliant\n---\n\n# Page'
    const result = applyStatusDerivation(content, ext)
    expect(result).toContain("status: partial")
  })

  it("overwrites existing status", () => {
    const content = '---\ntype: compliance\nstatus: compliant\nitem_statuses:\n  "9(2)": non-compliant\n---\n\n# Page'
    const result = applyStatusDerivation(content, ext)
    expect(result).toContain("status: non-compliant")
    expect(result).not.toMatch(/status: compliant/)
  })

  it("ignores non-compliance pages", () => {
    const content = "---\ntype: requirement\nid: a9\n---\n\n# Req"
    expect(applyStatusDerivation(content, ext)).toBe(content)
  })

  it("ignores pages without item_statuses", () => {
    const content = "---\ntype: compliance\nmaps_to: a9\n---\n\n# Page"
    expect(applyStatusDerivation(content, ext)).toBe(content)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/compliance-post-ingest.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/compliance-post-ingest.ts
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

  if (hasStatus) {
    return rawBlock.replace(/^status:\s*.+$/m, `status: ${derived}`) + body
  }

  const closeIdx = rawBlock.lastIndexOf("---")
  return rawBlock.slice(0, closeIdx) + `status: ${derived}\n` + rawBlock.slice(closeIdx) + body
}

function extractItemStatuses(raw: string): Record<string, string> | null {
  try {
    const yml = raw.replace(/^---\s*\n/, "").replace(/\n---\s*$/, "")
    const parsed = yaml.load(yml) as Record<string, unknown>
    if (parsed?.item_statuses && typeof parsed.item_statuses === "object") {
      const result: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed.item_statuses as Record<string, unknown>)) {
        if (typeof v === "string") result[k] = v
      }
      return result
    }
  } catch { /* invalid YAML */ }
  return null
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/compliance-post-ingest.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/compliance-post-ingest.ts src/lib/compliance-post-ingest.test.ts
git commit -m "feat: post-ingest status derivation for compliance pages"
```

---

## Task 7: Integrate into Ingest Pipeline — Schema + Source Type

**Files:**
- Modify: `src/lib/ingest.ts`

- [ ] **Step 1: Add new imports at top of ingest.ts**

```typescript
import { loadSchema, type FrameworkConfig } from "@/lib/schema-loader"
import { detectSourceType, type SourceType } from "@/lib/source-type"
import { applyStatusDerivation } from "@/lib/compliance-post-ingest"
```

- [ ] **Step 2: Replace schema reading in autoIngestImpl() (L319-325)**

Find:
```typescript
  const [sourceContent, schema, purpose, index, overview] = await Promise.all([
    tryReadFile(sp),
    tryReadFile(`${pp}/schema.md`),
    tryReadFile(`${pp}/purpose.md`),
    tryReadFile(`${pp}/wiki/index.md`),
    tryReadFile(`${pp}/wiki/overview.md`),
  ])
```

Replace:
```typescript
  const [sourceContent, schemaResult, purpose, index, overview] = await Promise.all([
    tryReadFile(sp),
    loadSchema(pp),
    tryReadFile(`${pp}/purpose.md`),
    tryReadFile(`${pp}/wiki/index.md`),
    tryReadFile(`${pp}/wiki/overview.md`),
  ])
  const schema = schemaResult.merged
  const frameworkConfig = schemaResult.frameworkConfig
  const sourceType = detectSourceType(sp)
```

- [ ] **Step 3: Pass sourceType to prompt builders (L546 and L577)**

Analysis call — change:
```typescript
      { role: "system", content: buildAnalysisPrompt(purpose, index, truncatedContent) },
```
To:
```typescript
      { role: "system", content: buildAnalysisPrompt(purpose, index, truncatedContent, sourceType) },
```

Generation call — change:
```typescript
      { role: "system", content: buildGenerationPrompt(schema, purpose, index, fileName, overview, truncatedContent) },
```
To:
```typescript
      { role: "system", content: buildGenerationPrompt(schema, purpose, index, fileName, overview, truncatedContent, sourceType) },
```

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run src/lib/ingest`
Expected: PASS (new params are optional, existing calls use defaults)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest.ts
git commit -m "feat: integrate schema-loader and source-type into ingest pipeline"
```

---

## Task 8: Source-Type-Aware Prompts

**Files:**
- Modify: `src/lib/ingest.ts` (buildAnalysisPrompt, buildGenerationPrompt)

- [ ] **Step 1: Update buildAnalysisPrompt signature and add source type context**

Add `sourceType` parameter (default `"general"`). Add to the prompt array before the filter:
```typescript
    sourceType !== "general"
      ? `## Source Type\nThis source is from "${sourceType}/".\n${
          sourceType === "regulation"
            ? "Focus on identifying specific obligations, requirements, and structural references (article/paragraph/point)."
            : sourceType === "compliance-docs"
              ? "Focus on identifying which regulatory requirements this document addresses and coverage degree."
              : sourceType === "external"
                ? "Focus on the official status of this document and impact on existing compliance tracking."
                : ""
        }`
      : "",
```

- [ ] **Step 2: Update buildGenerationPrompt with compliance engine instructions**

Add `sourceType` parameter. Add source-type-specific generation instructions after the schema section in the prompt array:
```typescript
    sourceType === "regulation"
      ? [
          "## COMPLIANCE ENGINE: Regulation Source",
          "Generate TWO types of pages:",
          "1. Requirement pages in wiki/requirements/ (type: requirement) with id, title_primary, title_secondary, source_version, item keys in requires list",
          "2. Initial compliance pages in wiki/compliance/ (type: compliance) with maps_to, item_statuses (all non-compliant), DO NOT set status field",
          "item_statuses keys use short notation from the framework schema (e.g. '9(2)', '9(5)').",
        ].join("\n")
      : sourceType === "compliance-docs"
        ? [
            "## COMPLIANCE ENGINE: Compliance Document",
            "Update existing wiki/compliance/ pages:",
            "- Set item_statuses for covered items to compliant or partial",
            "- Add document to documents list",
            "- DO NOT set the status field (system derives it)",
          ].join("\n")
        : sourceType === "external"
          ? "## COMPLIANCE ENGINE: External Source\nEvaluate status, generate REVIEW blocks for affected pages."
          : "",
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/ingest`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ingest.ts
git commit -m "feat: source-type-aware prompts for regulation/compliance-docs/external"
```

---

## Task 9: Post-Ingest Hook

**Files:**
- Modify: `src/lib/ingest.ts` (after writeFileBlocks in autoIngestImpl)

- [ ] **Step 1: Add post-ingest status derivation after writeFileBlocks**

Find (after ~L627):
```typescript
  const { writtenPaths, warnings: writeWarnings, hardFailures } = await writeFileBlocks(...)
```

Add immediately after:
```typescript
  if (sourceType === "regulation" || sourceType === "compliance-docs") {
    for (const wPath of writtenPaths) {
      if (wPath.startsWith("wiki/compliance/")) {
        try {
          const full = `${pp}/${wPath}`
          const page = await readFile(full)
          const updated = applyStatusDerivation(page, frameworkConfig.complianceExtended)
          if (updated !== page) await writeFile(full, updated)
        } catch { /* non-critical */ }
      }
    }
  }
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/ingest.ts
git commit -m "feat: post-ingest status derivation hook for compliance pages"
```

---

## Task 10: Sample Content and E2E Validation

**Files:**
- Create: `raw/sources/regulation/primary/ai-act-article-9-sample.md`
- Create: `raw/sources/compliance-docs/risk-assessment/sample-risk-assessment.md`

- [ ] **Step 1: Create sample regulation source**

A trimmed version of AI Act Article 9 (risk management system) covering paragraphs 2, 5, 7, 8.

- [ ] **Step 2: Launch app and test regulation ingest**

```bash
npm run tauri dev
```

Ingest the Article 9 sample. Verify:
- `wiki/requirements/` contains a requirement page with `type: requirement`
- `wiki/compliance/` contains a compliance page with `type: compliance`, `item_statuses` (all `non-compliant`), derived `status: non-compliant`

- [ ] **Step 3: Create and ingest sample compliance document**

A mock risk assessment covering Article 9(2) and 9(5). After ingest, verify:
- Compliance page `item_statuses` updated (9(2) and 9(5) changed)
- `status` re-derived (should become `partial`)

- [ ] **Step 4: Commit sample content**

```bash
git add raw/sources/
git commit -m "test: add AI Act sample content for e2e validation"
```

---

## v0.1 Completion Checklist

- [ ] AI Act Chapter 3 対象条文の Requirement Pages が生成されている
- [ ] 各 Requirement Page に対応する初期 Compliance Pages が生成され、item_statuses が確認できる
- [ ] compliance-docs/ に文書を配置して再インジェストすると、少なくとも1項目の item_statuses が更新され、導出された status が正しく計算されている
- [ ] regulation/ のソースを更新すると差分が Review Queue に入る
- [ ] 全既存テスト + 新規テストが PASS
