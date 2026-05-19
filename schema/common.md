# Compliance Wiki Engine — Common Schema

This schema defines the engine-wide conventions shared across all framework instances.
A separate `framework.md` in this directory adds framework-specific extensions.

---

## Page Types

```yaml
page_types:
  requirement:
    description: "規制/規格の要求事項を構造化したページ"
    template:
      frontmatter:
        base:
          - type
          - id
          - title_primary
          - title_secondary
          - category
          - requires
          - related_standards
          - source_version
          - last_verified_against_source
      body:
        - overview
        - requirements_list
        - standards_references
        - related_pages
  compliance:
    description: "要求事項に対する自社の適合状況ページ"
    template:
      frontmatter:
        base:
          - type
          - maps_to
          - owner
          - status
          - last_reviewed
          - item_statuses
          - documents
      body:
        - status_summary
        - applicability_note
        - blockers
        - document_mapping
        - next_actions
  overview:
    description: "横断ページ（カバレッジ、Gap分析）[v0.2]"
```

## Naming Conventions

- Requirement page IDs use kebab-case derived from structure units: `article-9`, `clause-5-2`
- Compliance page IDs mirror the requirement they map to: `compliance-article-9`
- `item_statuses` keys use the framework's short notation (e.g. `"9(2)"`, `"A.5.1"`)

## Status Models

```yaml
status_models:
  compliance:
    - compliant       # 要件に適合済み
    - partial          # 部分的に対応（一部未完了）
    - non-compliant    # 未対応
    - not-applicable   # 自社システムに該当しない（根拠記載が必要）
  document:
    - missing          # 文書未作成
    - draft            # ドラフト作成済み
    - review           # レビュー中
    - approved         # 承認済み
    - outdated         # 内容が古く更新が必要
```

## Status Derivation

Page-level `status` is derived deterministically by the system from `item_statuses`.
The LLM writes `item_statuses` only — it must NOT write `status`.

Framework-extended statuses (defined in `framework.md` `compliance_extended`) are
normalized via `maps_to_base` before applying these rules.

```yaml
status_derivation:
  rules:
    - condition: "全項目が not-applicable"
      result: not-applicable
    - condition: "全項目が compliant または not-applicable（not-applicable のみの場合は除く）"
      result: compliant
    - condition: "全項目が non-compliant"
      result: non-compliant
    - condition: "上記以外（部分対応、拡張ステータス混在等）"
      result: partial
```

## Ingest Instructions

Per-source-type base prompts. Framework-specific overrides in `framework.md` are
appended after these base prompts (`merge_strategy: append`).

```yaml
ingest_base:
  regulation:
    prompt: >
      ソース文書から要求事項を構造化抽出し、requirement ページを生成・更新する。
    merge_strategy: append
  compliance-docs:
    prompt: >
      ソース文書がどの要求事項をカバーしているか判定し、
      compliance ページの item_statuses と文書マッピングを更新する。
      ページ全体の status は設定しないこと（システムが自動導出する）。
    merge_strategy: append
  external:
    prompt: >
      外部文書のステータスと既存 Wiki への影響を評価し、関連ページを更新する。
    merge_strategy: append
```

## Source Update Policy

```yaml
source_update_policy:
  regulation: |
    regulation/ のソースが更新された場合（条文の改正版、corrected version 等）:
    1. 既存の Requirement Pages と差分を検出
    2. 変更があったページを Review Queue に入れる（自動上書きしない）
    3. 人間が差分を確認し、Requirement Page の更新を承認
    4. 承認後、関連する Compliance Pages のステータスを再評価
  compliance-docs: |
    compliance-docs/ のソースが更新された場合（文書の改版等）:
    1. 同一パスのファイル更新を検出
    2. 関連する Compliance Pages を Review Queue に入れる
    3. 再インジェストで item_statuses と文書マッピングを更新提案
    4. 人間が確認・承認後に反映
```
