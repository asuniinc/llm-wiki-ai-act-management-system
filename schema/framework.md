# EU AI Act — Framework Schema

This file defines framework-specific extensions for the EU AI Act compliance instance.
It is loaded alongside `common.md` by the schema loader and merged into ingest prompts.

---

## Framework

```yaml
name: "EU AI Act"
version: "Regulation (EU) 2024/1689"
scope: "High-risk AI systems — Chapter 3, Annex III (4) Employment"
```

## Structure Units

```yaml
structure_units:
  level1: { name: "Article", name_ja: "条" }
  level2: { name: "Paragraph", name_ja: "項" }
  level3: { name: "Point", name_ja: "号" }
  annexes: { name: "Annex", name_ja: "附属書" }
```

## Source Languages

```yaml
source_languages:
  primary: "en"
  secondary: ["ja"]
```

## Custom Status Models

### eu_preparation

EU委員会のガイダンス・技術文書等の整備状況を追跡するステータス。

```yaml
eu_preparation:
  - published        # 公開済み
  - draft-available  # 草案あり
  - in-preparation   # 準備中
  - not-started      # 未着手
  - not-required     # 不要
```

### compliance_extended

共通の compliance ステータスに対するフレームワーク固有の拡張。
`maps_to_base` は `common.md` の `status_derivation` ルール適用前の正規化先。

```yaml
compliance_extended:
  - value: blocked
    maps_to_base: partial
```

## Page Type Extensions

```yaml
page_type_extensions:
  requirement:
    frontmatter_additions:
      - eu_preparation
  compliance:
    frontmatter_additions: []
```

## Ingest Overrides

Framework-specific instructions appended to `common.md` base prompts.

### regulation

```
EU AI Act の条文を読み、条・項単位で以下を抽出せよ：
- 義務の主体（provider / deployer / importer 等）
- 具体的な義務・要件の内容
- 参照先（附属書、整合規格、委任法令）
- 経過措置・適用時期
primary言語とsecondary言語の対応を明記すること。
```

### external

```
この文書のEU公式ステータス（published / draft / in-preparation）を判定し、
既存の requirement / compliance ページへの影響を評価せよ。
blocked ステータスの compliance ページで解除可能なものがあれば特定せよ。
```

## Terminology

```yaml
terminology:
  requirement: "義務/要件"
  section: "条"
  subsection: "項"
  provider: "プロバイダー"
  deployer: "デプロイヤー"
```
