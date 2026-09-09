# Provisional effort estimate

## Summary

**5–8 working days (approximately 40–65 focused engineering hours)** for one senior engineer familiar with Emacs Lisp and D3, including tests, documentation, integration, and review. Expected planning allowance: about 6 days. Human engineering effort, not an agent-runtime promise or fixed calendar deadline.

Scope incorporates confirmed configurable depth and pan/highlight, not physical re-layout or live graph expansion. No architecture replacement required.

## Bottom-up work breakdown

| Work package | Focused hours before integration/review buffer |
|---|---:|
| Pin graph contracts, saved-parameter compatibility, test environment | 2–3 |
| Main-agent failing ERT and browser fixtures/harness | 4–6 |
| Indexed multi-source traversal, exclusions, weights, regeneration | 8–12 |
| Hero/context styling, typed parallel edges, legend/statistics | 6–10 |
| Pan/highlight, selection state, drag/labels/sidebar, keyboard | 6–10 |
| Documentation, exporter smoke checks, large-graph verification | 4–7 |
| **Implementation subtotal** | **30–48** |

Add 15–20% for integration and regression review, plus 10–15% for user feedback/clarification: approximately 38–65 hours; rounded planning range 40–65 hours / 5–8 days.

The upper range accounts for uncertainty once; do not multiply these hours by additional ambiguity factors. This is a small repository-specific estimate rather than mechanically applying enterprise-sized module minimums from the estimation rubric.

## Contract-driven risk assessment

`plan.md` supplies explicit set-based graph invariants and focus state requirements. These are design contracts, not mechanically verified Dafny proofs; no implementation correctness or performance claim follows from them. Full formal-spec/SOW pipeline was not run for this focused feasibility request.

Resolved ambiguities:
1. Centering means viewport pan with existing layout preserved.
2. External neighborhood depth is configurable.

Remaining assumptions and impact:
- **Generation-time depth, not browser control.** Browser slider with preloaded max-depth graph would add roughly 1–2 days; live fetch beyond loaded data is a separate architecture and needs re-estimation.
- **Induced edges among included nodes.** Recommended: include all actual links whose endpoints are exported. Traversal-only edges instead would be a small policy/test change, not a new architecture.
- **Default 0 for compatibility; depth 1 easy to choose.** Switching default to 1 is negligible coding effort, but changes performance and existing user behavior.
- **D3 owns interaction.** Basic DOT/GEXF topology compatibility included; rich static exporter role/kind styling/attributes could add 0.5–1.5 days. Interactive refocusing for static exports is not included.
- **Hover previews retained.** Removing browser text previews as well as click navigation is a small additional change, approximately 1–3 hours with regression checks.
- **Typical network size unknown.** High-depth BFS can reach the entire connected component. Severe SVG/force-layout performance problems or strict large-network latency targets require re-estimation; do not promise unlimited scale or silently drop requested links.
- **Sequence signature boundaries.** Validate actual denote-sequence APIs/scheme with real dependency versions; preserve existing callers while avoiding accidental textual-prefix ancestry.
- **Unique IDs assumed by current renderer.** Fixtures should expose duplicate/exported-ID handling. A broad duplicate-note reconciliation policy is outside scope and would require a separate decision.

## Dependencies and critical path

Contract/schema + test setup → failing graph tests → context generation → hero rendering → combined browser validation → documentation/full-change review.

Click focus can be developed separately once node/edge identity contract is fixed, but one engineer's effort does not shrink through nominal parallelism. Main agent writes tests and commits; scoped workers can implement after failing tests exist.

Available tools: Emacs 30.2, Node, Dafny. Clean `emacs --batch -Q` cannot locate Denote, dash, or denote-sequence; implementation must establish a reproducible load-path/dependency setup. Do not infer installed interactive Emacs configuration from this clean-process result.

No Makefile or tracked test runner found. `make format`, `make check`, and `make test` are unavailable, not failed. Planned native gates: Emacs ERT and byte compilation with dependencies, JavaScript syntax and browser interaction tests, controlled HTML fixture rendering, DOT/GEXF smoke checks, documentation export checks where tooling exists.

## Confidence

High confidence in feasibility; moderate confidence in delivery range until representative note-count/edge-count data and dependency setup are checked. No live personal note collection was accessed, no browser session inspected, and no runtime feature implementation was tested during this planning pass.
