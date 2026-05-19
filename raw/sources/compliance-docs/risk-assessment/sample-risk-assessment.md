# Risk Assessment Report — hrdx AI System

**Document version:** 1.0
**Date:** 2026-05-15
**Author:** asuni Development Team

## Scope

This risk assessment covers the hrdx AI system, classified as a high-risk AI system under EU AI Act Annex III (4) — Employment, workers management.

## Risk Identification and Analysis (Article 9(2))

The following risks have been identified and analyzed:

1. **Bias in hiring recommendations** — Risk of discriminatory outcomes based on protected characteristics. Mitigated by bias testing framework and demographic parity constraints.
2. **Data quality issues** — Risk of training on unrepresentative data. Mitigated by data quality pipeline with automated validation.
3. **Transparency gaps** — Risk of opaque decision-making. Mitigated by explainability module providing per-decision rationale.

## Residual Risk Evaluation (Article 9(5))

After applying mitigation measures:
- Bias risk: Residual risk assessed as LOW (< 2% demographic parity deviation in testing)
- Data quality risk: Residual risk assessed as LOW (automated validation catches 99.5% of quality issues)
- Transparency risk: Residual risk assessed as MEDIUM (explanations cover 85% of decision factors)

Overall residual risk is assessed as acceptable given the safeguards in place.

## Coverage

This document addresses requirements under:
- Article 9(2): Risk identification and analysis — COVERED
- Article 9(5): Residual risk evaluation — COVERED
