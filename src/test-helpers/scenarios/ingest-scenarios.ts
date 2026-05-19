import type { IngestScenario } from "./types"

/**
 * Ingest scenarios drive autoIngest end-to-end. Two LLM responses per
 * scenario (stage 1 analysis, stage 2 generation with FILE + REVIEW blocks).
 *
 * FILE block format (what stage 2 must emit to write a wiki file):
 *   ---FILE: wiki/path/to/page.md---
 *   (file content, usually with YAML frontmatter)
 *   ---END FILE---
 *
 * REVIEW block format (what stage 2 emits to inject a review item):
 *   ---REVIEW: missing-page | Short title---
 *   Description.
 *   OPTIONS: Approve | Skip
 *   PAGES: page1.md, page2.md
 *   ---END REVIEW---
 *
 * Stage 2 may emit arbitrary prose around blocks — the parser only
 * cares about the delimited blocks.
 */

const AI_ACT_PURPOSE = `# Project Purpose — EU AI Act Compliance Management

## Goal

EU AI Act（高リスクAIシステム Chapter 3, Annex III (4) 雇用・労務）への
適合状況を構造的に管理し、必要な文書の洗い出しと対応状況の可視化を行う。

## Scope

- 対象規制: Regulation (EU) 2024/1689
- 対象カテゴリ: Annex III (4) — 雇用、労務管理
- 対象条文: 第6条以降（高リスクAIシステムの義務）
`

const AI_ACT_SCHEMA = `# Compliance Wiki Engine — Common Schema

## Page Types

\`\`\`yaml
page_types:
  requirement:
    description: "規制/規格の要求事項を構造化したページ"
  compliance:
    description: "要求事項に対する自社の適合状況ページ"
\`\`\`

## Status Models

\`\`\`yaml
status_models:
  compliance:
    - compliant
    - partial
    - non-compliant
    - not-applicable
\`\`\`

---

# EU AI Act — Framework Schema

## Source Languages

\`\`\`yaml
source_languages:
  primary: "en"
  secondary: ["ja"]
\`\`\`

## compliance_extended

\`\`\`yaml
compliance_extended:
  - value: blocked
    maps_to_base: partial
\`\`\`
`

const AI_ACT_FRAMEWORK = `# EU AI Act — Framework Schema

## Source Languages

\`\`\`yaml
source_languages:
  primary: "en"
  secondary: ["ja"]
\`\`\`

## compliance_extended

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
- 具体的な義務・要件の内容
\`\`\`
`

const BASIC_PURPOSE = `# Purpose

This wiki tracks deep-learning research concepts.
`

const BASIC_INDEX = `# Index

## Concepts
- [[attention]]
`

const BASIC_SCHEMA = `# Schema

## wiki/sources/
Each ingested source has a summary page here.

## wiki/concepts/
Each concept gets its own page.
`

export const ingestScenarios: IngestScenario[] = [
  // 1. basic-new-source — new concept wiki page + source summary, no reviews
  {
    name: "basic-new-source",
    description:
      "Stage 2 emits a single concept page + a source summary page. No " +
      "REVIEW blocks. The runner must see both files on disk and zero " +
      "reviews in the store.",
    initialWiki: {
      "purpose.md": BASIC_PURPOSE,
      "schema.md": BASIC_SCHEMA,
      "wiki/index.md": BASIC_INDEX,
    },
    source: {
      path: "raw/sources/rope-paper.md",
      content: [
        "# Rotary Position Embedding",
        "",
        "Rotary Position Embedding (RoPE) encodes positional information by",
        "rotating pairs of dimensions in query and key vectors. It naturally",
        "supports variable-length contexts and is now standard in LLMs.",
      ].join("\n"),
    },
    analysisResponse: [
      "## Key Concepts",
      "- Rotary Position Embedding (RoPE): rotates pairs of dimensions",
      "",
      "## Main Arguments",
      "- RoPE naturally supports variable-length contexts",
      "",
      "## Recommendations",
      "- Create wiki/concepts/rope.md",
      "- Create wiki/sources/rope-paper.md",
    ].join("\n"),
    generationResponse: [
      "I'll create one concept page and the source summary.",
      "",
      "---FILE: wiki/concepts/rope.md---",
      "---",
      "title: Rotary Position Embedding",
      "tags: [positional-encoding]",
      "sources: [rope-paper.md]",
      "---",
      "",
      "# Rotary Position Embedding",
      "",
      "RoPE rotates pairs of dimensions in [[attention]] queries and keys",
      "to encode absolute position while preserving relative-position invariance.",
      "---END FILE---",
      "",
      "---FILE: wiki/sources/rope-paper.md---",
      "---",
      "title: \"Source: rope-paper.md\"",
      "sources: [rope-paper.md]",
      "---",
      "",
      "# Source: rope-paper.md",
      "",
      "Paper introducing [[Rotary Position Embedding]].",
      "---END FILE---",
    ].join("\n"),
    expected: {
      writtenPaths: [
        "wiki/concepts/rope.md",
        "wiki/sources/rope-paper.md",
      ],
      fileContains: {
        "wiki/concepts/rope.md": [
          "title: Rotary Position Embedding",
          "[[attention]]",
        ],
        "wiki/sources/rope-paper.md": ["rope-paper.md"],
      },
      reviewsCreated: [],
    },
  },

  // 2. generates-review-items — REVIEW blocks in generation become store items
  {
    name: "generates-review-items",
    description:
      "Stage 2 emits one FILE and two REVIEW blocks (missing-page + " +
      "suggestion). Both reviews must appear in the store after ingest.",
    initialWiki: {
      "purpose.md": BASIC_PURPOSE,
      "schema.md": BASIC_SCHEMA,
      "wiki/index.md": BASIC_INDEX,
    },
    source: {
      path: "raw/sources/flash-attention.md",
      content:
        "# FlashAttention\n\nFlashAttention is an IO-aware exact attention algorithm.\n",
    },
    analysisResponse: "## Key Concepts\n- FlashAttention\n",
    generationResponse: [
      "---FILE: wiki/sources/flash-attention.md---",
      "---",
      "title: \"Source: flash-attention.md\"",
      "sources: [flash-attention.md]",
      "---",
      "",
      "# Source: flash-attention.md",
      "",
      "FlashAttention is mentioned here.",
      "---END FILE---",
      "",
      "---REVIEW: missing-page | FlashAttention---",
      "The source introduces FlashAttention but no dedicated page exists.",
      "OPTIONS: Create page | Skip",
      "PAGES: wiki/sources/flash-attention.md",
      "---END REVIEW---",
      "",
      "---REVIEW: suggestion | Add IO-aware algorithms survey---",
      "Consider a survey page grouping IO-aware attention variants.",
      "---END REVIEW---",
    ].join("\n"),
    expected: {
      writtenPaths: ["wiki/sources/flash-attention.md"],
      reviewsCreated: [
        { type: "missing-page", titleContains: "FlashAttention" },
        { type: "suggestion", titleContains: "IO-aware" },
      ],
    },
  },

  // 3. references-existing-wikilinks — generated pages link to existing pages
  {
    name: "references-existing-wikilinks",
    description:
      "The generated wiki page must include [[attention]] — linking back " +
      "to a page that already exists in the wiki. Runner asserts substring.",
    initialWiki: {
      "purpose.md": BASIC_PURPOSE,
      "schema.md": BASIC_SCHEMA,
      "wiki/index.md": BASIC_INDEX,
      "wiki/attention.md":
        "---\ntitle: Attention\n---\n\n# Attention\n\nThe attention mechanism.\n",
    },
    source: {
      path: "raw/sources/multi-head.md",
      content: "# Multi-Head Attention\n\nParallel attention heads.\n",
    },
    analysisResponse:
      "## Connections to Existing Wiki\n" +
      "- Multi-head attention is a variant of attention — existing [[attention]] page should be linked.\n",
    generationResponse: [
      "---FILE: wiki/concepts/multi-head-attention.md---",
      "---",
      "title: Multi-Head Attention",
      "---",
      "",
      "# Multi-Head Attention",
      "",
      "Multi-head [[attention]] runs several attention layers in parallel.",
      "---END FILE---",
      "",
      "---FILE: wiki/sources/multi-head.md---",
      "---",
      "title: \"Source: multi-head.md\"",
      "---",
      "",
      "# Source: multi-head.md",
      "",
      "Source for multi-head [[attention]].",
      "---END FILE---",
    ].join("\n"),
    expected: {
      writtenPaths: [
        "wiki/concepts/multi-head-attention.md",
        "wiki/sources/multi-head.md",
      ],
      fileContains: {
        "wiki/concepts/multi-head-attention.md": ["[[attention]]"],
      },
    },
  },

  // 4. ai-act-article-9 — regulation source generates requirement + compliance pages
  {
    name: "ai-act-article-9",
    description:
      "EU AI Act Article 9 regulation source is ingested. The compliance engine " +
      "must generate requirement pages in wiki/requirements/ and initial compliance " +
      "pages in wiki/compliance/ with item_statuses set to non-compliant. " +
      "Post-ingest status derivation sets the compliance page status to non-compliant.",
    initialWiki: {
      "purpose.md": AI_ACT_PURPOSE,
      "schema.md": AI_ACT_SCHEMA,
      "schema/framework.md": AI_ACT_FRAMEWORK,
      "wiki/index.md": "# Wiki Index\n\n## Requirements\n\n## Compliance\n",
    },
    source: {
      path: "raw/sources/regulation/primary/ai-act-article-9-sample.md",
      content: [
        "# Article 9 — Risk management system",
        "",
        "> Regulation (EU) 2024/1689, OJ L 2024/1689, 2024-07-12",
        "",
        "## Article 9(1)",
        "",
        "A risk management system shall be established, implemented, documented and maintained in relation to high-risk AI systems.",
        "",
        "## Article 9(2) — Risk identification and analysis",
        "",
        "The risk management system shall include the identification and analysis of the known and reasonably foreseeable risks that the high-risk AI system can pose to health, safety or fundamental rights.",
        "",
        "## Article 9(5) — Residual risk evaluation",
        "",
        "High-risk AI systems shall be tested for the purpose of identifying the most appropriate and targeted risk management measures.",
      ].join("\n"),
    },
    analysisResponse: [
      "## Key Concepts",
      "- Risk management system: mandatory framework for high-risk AI systems",
      "- Risk identification and analysis: obligation under Article 9(2)",
      "- Residual risk evaluation: testing obligation under Article 9(5)",
      "",
      "## Main Arguments & Findings",
      "- Provider must establish, implement, document and maintain a risk management system",
      "- System must identify known and foreseeable risks to health, safety, fundamental rights",
      "- Testing required to identify appropriate risk management measures",
      "",
      "## Recommendations",
      "- Create wiki/requirements/article-9.md for the requirement page",
      "- Create wiki/compliance/compliance-article-9.md for compliance tracking",
    ].join("\n"),
    generationResponse: [
      "---FILE: wiki/requirements/article-9.md---",
      "---",
      "type: requirement",
      "id: article-9",
      "title_primary: Risk management system",
      "title_secondary: リスク管理システム",
      "source_version: \"Regulation (EU) 2024/1689\"",
      "requires:",
      "  - \"9(1)\"",
      "  - \"9(2)\"",
      "  - \"9(5)\"",
      "sources: [ai-act-article-9-sample.md]",
      "created: 2026-05-19",
      "updated: 2026-05-19",
      "tags: [risk-management, high-risk-ai]",
      "related: [compliance-article-9]",
      "---",
      "",
      "# Article 9 — Risk management system",
      "",
      "## Overview",
      "",
      "Article 9 establishes the obligation for providers of high-risk AI systems to implement a risk management system.",
      "",
      "## Requirements",
      "",
      "### 9(1) — Establishment of risk management system",
      "A risk management system shall be established, implemented, documented and maintained.",
      "",
      "### 9(2) — Risk identification and analysis",
      "The system shall include identification and analysis of known and foreseeable risks.",
      "",
      "### 9(5) — Residual risk evaluation",
      "High-risk AI systems shall be tested to identify appropriate risk management measures.",
      "---END FILE---",
      "",
      "---FILE: wiki/compliance/compliance-article-9.md---",
      "---",
      "type: compliance",
      "maps_to: article-9",
      "owner: \"\"",
      "last_reviewed: 2026-05-19",
      "item_statuses:",
      "  \"9(1)\": non-compliant",
      "  \"9(2)\": non-compliant",
      "  \"9(5)\": non-compliant",
      "documents: []",
      "sources: [ai-act-article-9-sample.md]",
      "created: 2026-05-19",
      "updated: 2026-05-19",
      "tags: [risk-management, compliance]",
      "related: [article-9]",
      "---",
      "",
      "# Compliance — Article 9 Risk management system",
      "",
      "## Status Summary",
      "",
      "All items are currently non-compliant. Risk management system documentation needs to be established.",
      "",
      "## Next Actions",
      "",
      "1. Establish risk management system framework",
      "2. Document risk identification and analysis procedures",
      "3. Plan testing for residual risk evaluation",
      "---END FILE---",
      "",
      "---FILE: wiki/sources/ai-act-article-9-sample.md---",
      "---",
      "type: source",
      "title: \"Source: ai-act-article-9-sample.md\"",
      "sources: [ai-act-article-9-sample.md]",
      "created: 2026-05-19",
      "updated: 2026-05-19",
      "tags: [eu-ai-act, regulation]",
      "related: [article-9, compliance-article-9]",
      "---",
      "",
      "# Source: ai-act-article-9-sample.md",
      "",
      "EU AI Act Article 9 defines the risk management system requirements for high-risk AI systems.",
      "---END FILE---",
      "",
      "---FILE: wiki/index.md---",
      "---",
      "type: overview",
      "title: Wiki Index",
      "---",
      "",
      "# Wiki Index",
      "",
      "## Requirements",
      "- [[article-9]] — Risk management system (Article 9)",
      "",
      "## Compliance",
      "- [[compliance-article-9]] — Compliance tracking for Article 9",
      "",
      "## Sources",
      "- [[ai-act-article-9-sample]] — EU AI Act Article 9 source",
      "---END FILE---",
    ].join("\n"),
    expected: {
      writtenPaths: [
        "wiki/requirements/article-9.md",
        "wiki/compliance/compliance-article-9.md",
        "wiki/sources/ai-act-article-9-sample.md",
        "wiki/index.md",
      ],
      fileContains: {
        "wiki/requirements/article-9.md": [
          "type: requirement",
          "id: article-9",
          "title_primary: Risk management system",
          "9(1)",
          "9(2)",
          "9(5)",
        ],
        "wiki/compliance/compliance-article-9.md": [
          "type: compliance",
          "maps_to: article-9",
          "non-compliant",
        ],
        "wiki/sources/ai-act-article-9-sample.md": [
          "type: source",
          "ai-act-article-9-sample.md",
        ],
      },
      reviewsCreated: [],
    },
  },

  // 5. chinese-source — Chinese content flows through to Chinese wiki pages
  {
    name: "chinese-source",
    description:
      "Chinese-language source document; LLM responses in Chinese. " +
      "UTF-8 round-trip through file write must be clean.",
    initialWiki: {
      "purpose.md": "# 用途\n\n深度学习研究笔记。\n",
      "schema.md": BASIC_SCHEMA,
      "wiki/index.md": "# 索引\n\n- [[注意力机制]]\n",
    },
    source: {
      path: "raw/sources/transformer-survey.md",
      content: "# Transformer 综述\n\nTransformer 是一种基于注意力机制的神经网络架构。\n",
    },
    analysisResponse: "## 核心概念\n- Transformer：基于注意力机制的架构\n",
    generationResponse: [
      "---FILE: wiki/concepts/transformer.md---",
      "---",
      "title: Transformer",
      "---",
      "",
      "# Transformer",
      "",
      "Transformer 是一种基于 [[注意力机制]] 的神经网络架构。",
      "---END FILE---",
      "",
      "---FILE: wiki/sources/transformer-survey.md---",
      "---",
      "title: \"Source: transformer-survey.md\"",
      "---",
      "",
      "# Source: transformer-survey.md",
      "",
      "关于 [[Transformer]] 的综述。",
      "---END FILE---",
    ].join("\n"),
    expected: {
      writtenPaths: [
        "wiki/concepts/transformer.md",
        "wiki/sources/transformer-survey.md",
      ],
      fileContains: {
        "wiki/concepts/transformer.md": [
          "title: Transformer",
          "[[注意力机制]]",
        ],
      },
    },
  },
]
