# LLM Wiki Compliance Engine — Design Spec

## Overview

nashsu/llm_wiki をフォークし、規制/規格への適合管理に特化した「Compliance Wiki Engine」を構築する。初期インスタンスは EU AI Act（高リスクAI、第6条以降）を対象とし、`asuni/llm-wiki-ai-act-management-system` リポジトリとして運用する。

エンジン自体はフレームワーク非依存に設計し、Raw Source と `schema/framework.md` を差し替えるだけで異なる規制/規格（ISO 27001、ISO/IEC 42001 等）に対応できるようにする。

## Background

- EU AI Act は2024年に発効したが、EU委員会によるガイドライン・技術文書テンプレート・適合宣言の整備が遅延中
- この領域をサービスとして提供している事業者が少ない
- 自社（asuni）で AI Act 適合性をチェックする QMS もどきを内製したい
- 対象 AI システムは Annex III (4)（雇用・労務関連）に該当する HR 系プロダクト（hrdx）
- ISMS（ISO 27001）の構築も並行中であり、将来的に同じエンジンで ISMS 適合管理も視野に入る

## Users

| ユーザー | 用途 |
|----------|------|
| 開発チーム | 自社開発 AI システムの適合性を自己チェック |
| 法務/コンプライアンスチーム | 適合状況のモニタリング・報告 |

## Design Principles

1. **フレームワーク非依存**: エンジンは特定の規制/規格にハードコードしない。フレームワーク固有の振る舞いは `schema/framework.md` で定義する。
2. **将来の分離容易性**: Requirement Pages と Compliance Pages は同一 Wiki 層内だが、ページタイプとディレクトリで明確に分離し、将来 Dual-Layer（2つの独立 Wiki）に移行可能にする。
3. **LLM Wiki コアの尊重**: フォーク元の主要機能（2段階インジェスト、知識グラフ、Review Queue 等）は改変せず活用する。
4. **人間のレビューゲート**: LLM の条文解釈は法的判断を伴うため、Review Queue を通じて必ず人間の確認を経る。
5. **Git as Audit Trail**: 変更履歴は Git コミット履歴で追跡する。Wiki ページの変更、ステータス遷移、Review Queue での判断はすべて Git コミットとして記録される。（v0.2 で QMS/ISMS 要件としての十分性を検証し、不足があれば専用の監査ログ機構を追加する）

## Release Milestones

### v0.1: 要件洗い出しと対応状況の可視化

条文/規格の構造化 → 必要なものの洗い出し → 適合文書のインプット → 対応状況の可視化。AI Act はまだ明確な QMS 定義が固まっていないフェーズであり、まずはこの範囲で価値を出す。

スコープ:
- Schema 分割（common.md + framework.md）
- ソースタイプ別インジェスト（regulation / compliance-docs / external）
- Requirement Pages + Compliance Pages の生成・更新
- item_statuses からの status 自動導出（システム側コード）
- ソースバージョン管理（条文更新時の再インジェスト）
- compliance-docs 更新時の Review Queue 連携
- LLM Wiki 既存 Lint のみ使用（矛盾検出、孤立ページ検出）

完了定義:
- AI Act Chapter 3（高リスクAI）の対象条文について、Requirement Pages が全件生成されている
- 各 Requirement Page に対応する初期 Compliance Pages が生成され、item_statuses が確認できる
- compliance-docs/ に文書を配置して再インジェストすると、対応する Compliance Page の item_statuses と status が更新される
- regulation/ のソースを更新すると差分が Review Queue に入る

### v0.2: QMS としての本格化

承認ワークフロー、適合カバレッジの自動チェック、監査証跡の強化。

スコープ:
- 承認ワークフロー（approver フィールド、ステータス遷移の承認記録）
- Lint 拡張（coverage_check, stale_documents, blocked_review, orphan_compliance）
- overview/ 配下へのサマリページ自動生成（カバレッジダッシュボード）
- Git ベース監査証跡の QMS/ISMS 十分性検証、不足時は専用ログ機構を追加

## Architecture

### Three-Layer Structure

```
Schema Layer (schema/)
  ├── common.md      ← エンジン共通定義
  └── framework.md   ← フレームワーク固有定義
         │
         │ guides (merged)
         ▼
Wiki Layer (wiki/)
  ├── requirements/   ← Requirement Pages（条文・箇条の構造化）
  ├── compliance/     ← Compliance Pages（適合状況・文書マッピング）
  └── overview/       ← 横断ページ（カバレッジ、Gap分析）[v0.2]
         ▲
         │ ingest (2-step, source-type-aware)
         │
Raw Sources Layer (raw/sources/)
  ├── regulation/          ← 規制/規格の原文
  │   ├── primary/           （framework.md で言語を定義）
  │   └── secondary/
  ├── compliance-docs/     ← 自社作成の適合文書
  │   ├── risk-assessment/
  │   ├── technical-doc/
  │   └── qms-procedures/
  └── external/            ← 補助的な外部資料
      ├── guidelines/
      └── standards/
```

### Schema Design

#### schema/common.md

エンジン共通の定義。全リポジトリ（全フレームワーク）で同一。

```yaml
page_types:
  requirement:
    description: "規制/規格の要求事項を構造化したページ"
    template:
      frontmatter:
        # base フィールド以外に framework.md の page_type_extensions で追加される場合がある
        base: [type, id, title_primary, title_secondary, category, requires,
               related_standards, source_version, last_verified_against_source]
      body: [overview, requirements_list, standards_references, related_pages]
  compliance:
    description: "要求事項に対する自社の適合状況ページ"
    template:
      frontmatter:
        # base フィールド以外に framework.md の page_type_extensions で追加される場合がある
        # item_statuses のキーは framework.md の structure_units に基づくショート記法を使用
        # 例: AI Act → "9(2)", "9(5)" / ISO 27001 → "A.5.1", "A.8.2"
        base: [type, maps_to, owner, status, last_reviewed, item_statuses, documents]
      body: [status_summary, applicability_note, blockers,
             document_mapping, next_actions]

status_models:
  compliance: [compliant, partial, non-compliant, not-applicable]
  document: [missing, draft, review, approved, outdated]

status_derivation:
  # ページ全体の status は item_statuses からシステム（コード）が決定論的に導出する。
  # LLM は item_statuses のみを判定し、status は書かない。
  #
  # item_statuses には framework.md の compliance_extended で定義された拡張ステータスも
  # 出現しうる。エンジンは拡張ステータスを maps_to_base で共通ステータスに正規化してから
  # 以下のルールを適用する。
  rules:
    - condition: "全項目が not-applicable"
      result: not-applicable
    - condition: "全項目が compliant または not-applicable（not-applicable のみの場合は除く）"
      result: compliant
    - condition: "全項目が non-compliant"
      result: non-compliant
    - condition: "上記以外（部分対応、拡張ステータス混在等）"
      result: partial

ingest_base:
  regulation:
    prompt: "ソース文書から要求事項を構造化抽出し、requirement ページを生成・更新する"
    merge_strategy: append  # framework.md の ingest_overrides を base prompt の後に追加
  compliance-docs:
    prompt: |
      ソース文書がどの要求事項をカバーしているか判定し、
      compliance ページの item_statuses と文書マッピングを更新する。
      ページ全体の status は設定しないこと（システムが自動導出する）。
    merge_strategy: append
  external:
    prompt: "外部文書のステータスと既存 Wiki への影響を評価し、関連ページを更新する"
    merge_strategy: append

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

#### schema/framework.md

フレームワーク固有の定義。リポジトリごとに異なる。

AI Act インスタンスの例:

```yaml
name: "EU AI Act"
version: "Regulation (EU) 2024/1689"
scope: "High-risk AI systems — Chapter 3, Annex III (4) Employment"

structure_units:
  level1: { name: "Article", name_ja: "条" }
  level2: { name: "Paragraph", name_ja: "項" }
  level3: { name: "Point", name_ja: "号" }
  annexes: { name: "Annex", name_ja: "附属書" }

source_languages:
  primary: "en"
  secondary: ["ja"]

custom_status_models:
  eu_preparation:
    - published        # 公開済み
    - draft-available  # 草案あり
    - in-preparation   # 準備中
    - not-started      # 未着手
    - not-required     # 不要
  compliance_extended:
    - value: blocked          # 外部依存（EU側未整備等）で対応不可
      maps_to_base: partial   # status_derivation での正規化先（common.md の共通ステータス）

page_type_extensions:
  requirement:
    frontmatter_additions: [eu_preparation]
  compliance:
    frontmatter_additions: []

ingest_overrides:
  regulation: |
    EU AI Act の条文を読み、条・項単位で以下を抽出せよ：
    - 義務の主体（provider / deployer / importer 等）
    - 具体的な義務・要件の内容
    - 参照先（附属書、整合規格、委任法令）
    - 経過措置・適用時期
    primary言語とsecondary言語の対応を明記すること。
  external: |
    この文書のEU公式ステータス（published / draft / in-preparation）を判定し、
    既存の requirement / compliance ページへの影響を評価せよ。
    blocked ステータスの compliance ページで解除可能なものがあれば特定せよ。

terminology:
  requirement: "義務/要件"
  section: "条"
  subsection: "項"
  provider: "プロバイダー"
  deployer: "デプロイヤー"
```

ISO 27001 インスタンスの例（参考）:

```yaml
name: "ISO/IEC 27001:2022"
scope: "Information Security Management System"

structure_units:
  level1: { name: "Clause", name_ja: "箇条" }
  level2: { name: "Sub-clause", name_ja: "細分箇条" }
  annexes: { name: "Annex A Control", name_ja: "附属書A 管理策" }

source_languages:
  primary: "ja"
  secondary: ["en"]

custom_status_models:
  soa_status:
    - applicable-implemented
    - applicable-planned
    - applicable-not-implemented
    - not-applicable

ingest_overrides:
  regulation: |
    ISO/IEC 27001 の要求事項を箇条単位で抽出せよ。
    shall（しなければならない）で示される必須要求と、
    附属書A の管理策を区別して構造化すること。
```

### Wiki Page Structure

#### Requirement Page

```markdown
---
type: requirement
id: article-9
title_primary: "Risk Management System"
title_secondary: "リスク管理システム"
category: chapter-3-high-risk
source_version: "OJ L 2024/1689, 2024-07-12"
last_verified_against_source: 2026-05-18
requires:
  - article-9-para-2-risk-identification
  - article-9-para-5-residual-risk
  - article-9-para-7-testing
  - article-9-para-8-post-market-monitoring
related_standards:
  - ISO/IEC 23894:2023
eu_preparation:                          # ← framework.md の page_type_extensions で定義
  ec_risk_guidance: in-preparation
---

# 第9条 リスク管理システム (Risk Management System)

## 概要
高リスクAIシステムには、継続的かつ反復的なリスク管理システムの
確立・実施・文書化・維持が義務付けられる。

## 要件一覧
1. [9(2)] リスクの特定・分析 — 合理的に予見可能なリスクを特定
2. [9(5)] 残留リスクの評価 — リスク管理措置後の残留リスクが許容可能か評価
3. [9(7)] テスト手順の確立 — 最も適切な措置を特定するための体系的テスト
4. [9(8)] 市販後監視との統合 — 第72条の市販後監視システムとの統合

## 整合規格・ガイダンス
- ISO/IEC 23894:2023 — published
- EC リスク管理ガイダンス — in-preparation

## 関連ページ
→ [[article-10-data-governance]]
→ [[article-17-qms]]
→ [[annex-iv-technical-documentation]]
```

#### Compliance Page

```markdown
---
type: compliance
maps_to: article-9
owner: dev-team
status: partial                            # ← システムが item_statuses から自動導出
last_reviewed: 2026-05-15
item_statuses:                             # ← LLM が判定する項目別ステータス
  "9(2)": compliant
  "9(5)": compliant
  "9(7)": partial
  "9(8)": blocked                          # ← framework.md の compliance_extended で定義
documents:
  - path: compliance-docs/risk-assessment/risk-assessment-v2.pdf
    covers: ["9(2)", "9(5)"]
    status: approved
  - path: compliance-docs/test-plan/test-plan-draft.md
    covers: ["9(7)"]
    status: draft
---

# 適合状況: リスク管理システム

## 対応状況サマリ
- ■ 9(2) リスク特定・分析 → compliant
- ■ 9(5) 残留リスク評価 → compliant
- ■ 9(7) テスト手順 → partial (draft)
- ■ 9(8) 市販後監視統合 → blocked (EC guidance in-preparation)

## 適用についての注記
（本条文は全項目が適用対象。not-applicable の項目がある場合、
ここに根拠を記載する。例: 「9(X) は〇〇の場合にのみ適用されるが、
当社システムは△△であるため該当しない。判断日: YYYY-MM-DD」）

## ブロッカー
- 9(8): EC市販後監視ガイダンス待ち → EU準備ステータス: in-preparation（2026 Q3見込み）

## 対応文書
- risk-assessment-v2.pdf — covers: 9(2), 9(5) — status: approved — updated: 2026-05-10
- test-plan-draft.md — covers: 9(7) — status: draft — updated: 2026-05-12

## 次のアクション
- [ ] テスト計画の最終化 → review
- [ ] 市販後監視手順の策定（EC発表後）
```

### Ingest Pipeline

3つのフェーズで Wiki が段階的に成長する。各フェーズとも LLM Wiki 既存の2段階インジェスト（分析→生成）を使用。

#### Phase 1: 初期構築（条文インジェスト）

1. AI Act 条文 (primary: EN, secondary: JA) + 附属書を `raw/sources/regulation/` に配置
2. エンジンがソースパスから `regulation` タイプと判定
3. `common.md` の `ingest_base.regulation.prompt` + `framework.md` の `ingest_overrides.regulation` を append マージしてLLMに指示
4. Step 1（分析）: 条文ごとの義務・要件を構造化抽出
5. Step 2（生成）: Requirement Pages（`source_version` 付き）+ 初期 Compliance Pages（全項目 non-compliant）を生成
6. 解釈が分かれる箇所は Review Queue に入り、人間の判断を待つ

#### Phase 2: 適合文書のフィードバックループ

1. 自社作成の適合文書を `raw/sources/compliance-docs/` に配置
2. エンジンが `compliance-docs` タイプと判定
3. Step 1（分析）: 文書がどの要件をカバーしているか、充足度はどうかを判定
4. Step 2（Wiki更新）: 対応する Compliance Page のステータス・文書マッピングを更新
5. Gap があれば次のアクションとして提示

#### Phase 3: 外部動向追跡

1. EU委員会の新規公開物を `raw/sources/external/` に追加
2. エンジンが `external` タイプと判定
3. Step 1（分析）: 文書の種類・ステータス・対応条文を特定
4. Step 2（Wiki更新）: カスタムステータス（eu_preparation 等）の更新、blocked 解除の判定

#### ソース更新時の再インジェスト

条文の改正版や corrected version が出た場合:

1. `regulation/primary/` のファイルを更新版で置き換え
2. エンジンが既存の Requirement Pages との差分を検出
3. 変更のある Requirement Pages を Review Queue に入れる（自動上書きはしない）
4. 人間が差分を確認・承認後、Requirement Page を更新
5. 更新された Requirement Page に紐づく Compliance Pages のステータスを再評価（`source_version` と `last_verified_against_source` を更新）

### Status Models

#### Compliance Status（共通 — common.md）

| Status | 意味 |
|--------|------|
| compliant | 要件に適合済み |
| partial | 部分的に対応（一部未完了） |
| non-compliant | 未対応 |
| not-applicable | 自社システムに該当しない（Compliance Page に根拠記載が必要） |

#### Document Status（共通 — common.md）

| Status | 意味 |
|--------|------|
| missing | 文書未作成 |
| draft | ドラフト作成済み |
| review | レビュー中 |
| approved | 承認済み |
| outdated | 内容が古く更新が必要 |

#### EU Preparation Status（AI Act 固有 — framework.md）

| Status | 意味 |
|--------|------|
| published | 公開済み |
| draft-available | 草案が公開されている |
| in-preparation | EU委員会が準備中 |
| not-started | 未着手 |
| not-required | 当該条文には不要 |

#### Blocked（AI Act 固有 — framework.md の compliance_extended）

| Status | 意味 |
|--------|------|
| blocked | 外部依存（EU側未整備等）で対応不可 |

他のフレームワークでは `blocked` に相当する状態が存在しない場合がある（例: ISO 27001）。`blocked` は `framework.md` の `custom_status_models.compliance_extended` で各フレームワークが必要に応じて定義する。

### Approval Workflow [v0.2]

v0.2 で以下の承認ワークフローを追加する:

1. **文書承認**: `draft` → `review` → `approved` のステータス遷移に承認者（`approver`）の記録を必須化
2. **適合宣言**: Compliance Status が `compliant` になったことの公式承認記録
3. **スコープ判断**: `not-applicable` の判断には法務/経営層の承認を必須化（Lint ルールで強制）
4. **Lint ルール追加**:
   - `approved_without_approver`: approver フィールドなしで approved になっている文書を検出
   - `not_applicable_without_rationale`: 根拠記載なしの not-applicable を検出

### Lint Rules

#### v0.1（LLM Wiki 既存のみ）

| ルール | 検出内容 |
|--------|----------|
| contradiction_check | （LLM Wiki 既存）矛盾する記述を検出 |
| orphan_page | （LLM Wiki 既存）リンクされていないページを検出 |

#### v0.2（適合カバレッジ拡張）

| ルール | 検出内容 |
|--------|----------|
| coverage_check | non-compliant な requirement の一覧と割合 |
| orphan_compliance | maps_to 先が存在しない compliance page |
| stale_documents | outdated ステータスの文書一覧 |
| blocked_review | blocked 項目の一覧と理由の現在ステータス確認 |
| approved_without_approver | approver 記録なしの approved 文書を検出 |
| not_applicable_without_rationale | 根拠なしの not-applicable を検出 |
| source_version_drift | source_version が最新の regulation ソースと一致しない Requirement Page を検出 |

Lint 結果は `wiki/overview/` 配下にサマリページとして自動生成（v0.2）。

## Fork Modification Scope

### v0.1 改修箇所

| Layer | 内容 | 規模感 |
|-------|------|--------|
| Schema | schema.md → schema/ ディレクトリ化、common.md + framework.md の読み込み・マージロジック | 中 |
| Ingest | ソースタイプ判定（パスベース）、framework.md のプロンプト append マージ、compliance page 自動更新 | TBD（ソースコード調査後に確定） |
| Ingest | ソース更新時の差分検出 → Review Queue 連携 | TBD |
| Status Derivation | item_statuses → status の決定論的導出ロジック（コード実装） | 小 |
| Page Types | requirement / compliance ページタイプの frontmatter 定義とテンプレート | 小 |

### v0.2 改修箇所

| Layer | 内容 | 規模感 |
|-------|------|--------|
| Approval | 承認ワークフロー（approver フィールド、ステータス遷移の承認記録） | 中 |
| Lint | 適合カバレッジ系ルール追加（7ルール） | 中 |
| Overview | overview/ 配下へのサマリページ自動生成 | 小〜中 |
| Audit | Git ベース監査証跡の QMS/ISMS 十分性検証、不足時は専用ログ機構 | TBD |

### 改修しない箇所（LLM Wiki コアをそのまま活用）

- 2段階チェーン・オブ・ソート インジェスト基盤
- 知識グラフ（sigma.js + graphology + ForceAtlas2）
- Louvain コミュニティ検出
- クエリ取得パイプライン（トークン化検索 + ベクトル検索 + グラフ拡張）
- Review Queue（非同期レビューシステム）
- マルチフォーマット対応（PDF, DOCX, PPTX 等）
- Web Clipper（EU公開物の取込に活用）
- Tauri v2 デスクトップアプリ基盤
- Deep Research（知識ギャップ検出時のウェブ検索連携）

## Operational Workflow

| タイミング | アクション |
|------------|------------|
| Day 1 | AI Act 条文 (EN+JA) + 附属書を regulation/ に配置 → 初回インジェスト |
| Day 2-3 | Review Queue 確認: 自社システムへの適用可否、ハイリスク該当判定を人間が判断 |
| Week 1-2 | 生成された Compliance Pages から必要文書一覧を確認 → 最優先文書の作成着手 |
| 随時 | 作成文書を compliance-docs/ に配置 → 再インジェスト → Compliance Pages 自動更新 |
| 定期 | EU委員会の新規公開物を external/ に追加 → EU準備ステータス更新 → blocked 解除判定 |
| 条文更新時 | regulation/ のソースを更新 → 差分検出 → Review Queue で確認 → Requirement/Compliance Pages 更新 |

## Technical Stack

- **Base**: nashsu/llm_wiki (Tauri v2 + React 19 + TypeScript + Vite)
- **LLM Provider**: OpenAI (GPT-4o)
- **Repository**: asuni/llm-wiki-ai-act-management-system

## Open Questions

1. LLM Wiki のソースコードの構造を詳細調査した上で、schema ディレクトリ化・インジェスト拡張の具体的な実装箇所と規模を特定する必要がある
2. `common.md` の上流管理方法（初期は同一リポジトリ内で十分、複数リポジトリ化した段階で検討）
3. AI Act 条文の入手形態（EUR-Lex PDF / HTML / 既存の構造化データ）
4. 日本語参考訳のソース（公的機関の訳、自社訳、既存の翻訳プロジェクト等）
5. Git コミット履歴を監査証跡として使用する方針が、一般的な QMS/ISMS の要件として十分かの検証が必要（v0.2 で対処）
6. LLM Wiki の2段階インジェストが「1ソース → 1ページ」を前提としている場合、primary/secondary の2言語ソースを1つの Requirement Page にまとめる方法の調査が必要
7. 複数フレームワークのカスタムステータスと共通ステータスの関係 — `canonical_mapping`（例: ISO 27001 の `applicable-implemented` → 共通の `compliant`）の設計。Lint ルールをフレームワーク非依存で動作させるために必要（v0.2 で ISO 27001 インスタンスを検討する段階で対処）
8. 1つの Requirement Page に対し、複数プロダクトがそれぞれ独自の Compliance Page を持つケースの設計（hrdx 以外のプロダクトが増えた場合の拡張性）
