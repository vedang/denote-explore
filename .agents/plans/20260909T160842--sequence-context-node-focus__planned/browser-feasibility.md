# Browser feasibility: sequence context + node focus

## Review findings

- **High, direct behavior conflict — `denote-explore-network.html:338-342`.** Node click calls `window.open(d.filename, "_blank")` for every non-Keywords graph. This exactly causes unwanted text/browser tabs. Replace with focus-only action; do not retain any alternate open path.
- **Low/medium — `:250-264`.** D3 zoom applies transform to `svgGroup`; simulation owns node `x/y` and tick redraws geometry (`:418-457`). Centering clicked node can therefore be implemented as a zoom transform (translate + existing scale), without changing coordinates or restarting force simulation. Preserve current zoom scale extent `[0.1,4]`. Compute screen/SVG coordinates with `getScreenCTM`/inverse or known SVG viewBox; animate transition, and let normal zoom events remain source of truth.
- **Medium — `:304-315`, `:421-449`.** Links are plain lines; directed edges use one marker per original edge. Highlighting should toggle classes/styles on node, incident links, and labels, keyed by IDs, while leaving geometry untouched. Use `source.id`/`target.id`, not object identity, since D3 forceLink mutates edge endpoints into node objects. Keep marker-end unchanged; avoid replacing marker IDs during redraw.
- **Medium — parallel edges.** JSON edge counting (`denote-explore.el:1278-1283`; graph builders use `denote-explore--network-count-edges`) generally collapses repeated source/target links and stores `weight`. Sequence edges are generated once per signature relationship (`:1221-1267`). If context introduces multiple semantic edge kinds between same pair, plain lines overlap and marker identity becomes ambiguous. Recommended: add stable edge kind/key in data and render curved offsets or explicitly aggregate; do not rely on DOM index as a durable key.
- **Medium — filter/redraw seam — `:808-823`.** Label-density input rebinds labels and calls `simulation.alpha(1).restart()`, although node/link data stay intact. Highlight state must be held in `selectedNodeId` and reapplied after label joins/ticks; do not infer selection from CSS alone. Isolated-node toggle (`:580-588`) hides circles only, leaving labels/edges potentially visible; focus/highlight must tolerate hidden nodes and expose clear state.
- **Medium — drag seam — `:399-415`, `:459-476`.** Drag fixes `fx/fy`, restarts simulation, then clears them. Focus transform must not set `fx/fy` or call simulation restart. Click-after-drag needs movement threshold or drag suppression to avoid accidental selection; keyboard activation needs a separate handler.
- **High — missing sequence context in loaded data.** Sequence graph generation filters `denote-directory-files` by signature (`denote-explore.el:1221-1233`), then creates only parent/child signature edges (`:1240-1267`). JSON encoder serializes only generated `meta`, `nodes`, `edges` (`:1278-1283`). Browser cannot discover external inbound/outbound links absent from `data`; adding context requires generator changes to include context nodes/edges, or a second data payload/request (not available in current self-contained HTML).
- **High — hero preservation.** Sequence GraphViz explicitly switches geometry (`denote-explore.el:1291-1305`, square nodes and no `layout=neato`); D3 currently uses one generic force layout (`denote-explore-network.html:418-427`) and does not honor sequence hierarchy visually. Add context as secondary edges/nodes with a distinct class, keep sequence edges primary, and constrain context count/depth. Do not physically re-layout hero sequence on click; zoom/pan only.
- **Medium — edge direction and markers.** Docs define file links as directed and arrows as source→target (`denote-explore.org:128-145`, `:225-225`); `data.meta.directed` controls marker display (`:314`). Sequence metadata is directed (`denote-explore.el:1228-1230`) even though hierarchy is parent→child. Context must preserve inbound/outbound semantics and use marker direction consistently; highlight both incident directions but style inbound/outbound differently for comprehension.
- **Medium — accessibility.** Nodes are SVG circles with mouse-only click/hover (`:333-395`), no focusability, role, keyboard handler, or persistent selected-state text. Add `tabindex="0"`, accessible name/role, Enter/Space activation, visible focus ring, and a non-color-only selection indicator. Sidebar text currently says hover-only (`:215`, `:327`, `:395`); update to describe click selection and keyboard support. Escape should clear selection; announce selection and connection counts via an `aria-live` region.
- **Medium — sidebar preview/security/UX.** Hover injects filename-derived HTML including iframe/image (`:343-394`) and immediately clears on mouseout (`:395`), so click selection should not depend on hover sidebar content. Keep preview optional or make selected details persistent. Treat generated names/keywords as untrusted when inserted with `.html`; use text content/escaping while touching this area.
- **Medium — export compatibility.** D3-only focus/highlight is runtime behavior. GraphViz/GEXF remain static/export paths (`denote-explore.el:197-209`; docs `denote-explore.org:253-263`), and GraphViz SVG currently emits `URL="filename"` hyperlinks (`:1310-1329`). Removing browser opening from D3 does not alter exports, but any new context edge/node fields must be ignored safely by existing encoders or explicitly encoded. Do not promise click focus in PDF/PNG/GEXF.
- **Low/medium — loaded-data limits.** HTML embeds complete JSON (`:226`); no live reload. Docs state generated JSON is merged into template and browser displays it (`denote-explore.org:266-268`). Context reflects graph-generation-time files only; stale/missing filenames and invalid edges are partially handled by node-ID pruning (`:231-235`), but missing context cannot be fetched client-side.

## Concrete plan

1. Add selection state and stable node/edge keys in template. Change node click to `selectNode(d)` only; prevent default and suppress click after drag.
2. Implement `selectNode`: derive incident edges by IDs; toggle classes/opacity/strokes/marker styling for selected node, neighbors, and connected edges; keep unrelated graph subdued but visible. Persist selected state through label joins and simulation ticks.
3. Center via zoom transform transition on `svg`, preserving node coordinates, drag state, current scale (clamped to extent), and user pan. Provide reset/clear selection.
4. Make nodes keyboard-focusable and announce selection. Replace hover-only sidebar guidance; retain hover as transient preview, click as persistent focus.
5. Extend sequence graph data generation with an explicit context policy: retain sequence nodes/edges as hero, add only direct inbound/outbound Denote-link context (bounded and marked `kind: "context"`), and define whether context nodes outside selected sequence are included. Prefer server-side generation because embedded JSON has no discovery capability.
6. Render sequence edges first/strong, context edges second/weaker/dashed; distinguish inbound/outbound markers. Handle duplicate/parallel edges with stable keys plus curved offsets or aggregation.
7. Test D3 JSON graphs for community, neighbourhood, keyword, and sequence: click never opens tab; center works after zoom/pan; drag does not accidentally select; slider/isolate redraw preserves selection; keyboard works; arrows and parallel edges remain correct; exports unchanged.

## Risks and effort

- **Risks:** ambiguous meaning of “external context” (direct links only vs recursive/depth); sequence subset may omit targets; duplicate edge semantics; force simulation can visually drift unless centering stays transform-only; color/opacity-only highlight fails accessibility; browser file-preview behavior may still be mistaken for opening if selected sidebar preview remains.
- **Suggested scope decision:** direct one-hop inbound/outbound links only, bounded to sequence hero plus context nodes, with context visually secondary. Document that generated graph is snapshot, not live.
- **Human effort:** template-only node focus/accessibility/zoom: **1–2 days** including manual browser testing. Sequence context data model + rendering + export compatibility + tests: **2–4 days**. If recursive context, persistent layout, or GraphViz parity required: **+2–4 days**.

## Start here

Open `denote-explore-network.html:250-476` first: zoom, click, hover, drag, force tick, and edge marker seams are contiguous. Then inspect `denote-explore.el:1221-1267` before designing sequence context; current payload cannot support context without generator changes.

## Residual risks

- Existing custom templates via `denote-explore-network-d3-template` may not receive new fields or behavior (docs `denote-explore.org:282-287`).
- Current generated edge objects can be strings before force-link resolution; code must normalize IDs robustly.
- Sidebar uses raw HTML and iframe file paths; selected-state redesign should avoid introducing injection or cross-origin assumptions.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Concrete severity-tagged findings cite denote-explore-network.html, denote-explore.el, denote-explore.org, and readme.org with line ranges."
    }
  ],
  "changedFiles": [],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "nl -ba denote-explore-network.html / grep targeted symbols; read relevant HTML, Elisp, and Org docs",
      "result": "passed",
      "summary": "Read-only source and documentation inspection completed."
    }
  ],
  "validationOutput": ["Artifact contains review findings, concrete plan, effort range, and residual risks."],
  "residualRisks": ["External context scope and export parity require product decision."],
  "noStagedFiles": true,
  "diffSummary": "No source changes; feasibility artifact only.",
  "reviewFindings": ["No source edits made. Main blockers are missing sequence context in embedded payload and accessibility gaps in mouse-only node interaction."],
  "manualNotes": "Direct context policy recommended: one-hop inbound/outbound links, sequence remains hero."
}
```