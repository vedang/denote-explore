# Sequence context and node focus

Status: planned; implementation not authorized.
Date: 2026-09-09.

## Outcome and decisions

Both requests are reasonable and feasible within the current Lisp → graph alist → JSON → D3 HTML architecture. No server, Emacs/browser bridge, or replacement graph library is needed for the confirmed scope.

Confirmed by user:
- Sequence should remain the focal group while showing inbound/outbound connections to other notes.
- External context depth must be configurable, not fixed to one hop.
- Clicking a node pans to it and highlights its connections; it does not rearrange the graph or load another neighborhood.
- Node clicks must not open notes in browser tabs.
- Initialize Beads, but create no issues. Initialization completed; issue count is zero.

Recommended defaults, not yet explicitly approved:
- Context depth is a nonnegative integer: 0 = existing hierarchy-only graph; 1 = direct neighbors; n = n hops from the whole sequence. Initially preserve default 0 for compatibility, with a prompt/default customization for choosing larger depths.
- Depth is chosen in Emacs when generating the graph. A browser depth slider is not included.
- For positive depth, include all actual Denote links between included nodes (an induced subgraph), including links between frontier nodes. Expansion uses both incoming and outgoing links; arrow direction remains original.
- Click focus applies to all D3 graph types, including Keywords. It highlights immediate incident edges, regardless of generation depth. No alternate/modifier-click opening behavior.
- Hover previews remain unchanged unless requested otherwise. “Never open on click” is separate from existing hover iframe previews.

## Codebase map

This is a compact Emacs package, not a web application with a backend:
- `denote-explore.el`: statistics/bar charts, random walks, janitor commands (duplicates, dead links, keywords, metadata), and graph construction/export. Requires Emacs 29.1+, Denote 4.2, dash, denote-regexp; denote-sequence is optional and gates Sequence selection.
- `denote-explore-network.html`: standalone D3 v7 template containing graph layout, zoom, drag, hover sidebar, label-density control, and info panel.
- `denote-explore.org`: manual source; `.texi` and `.info` are distribution documentation. `readme.org`: configuration and changelog.
- No tracked test suite, Makefile, package.json, or CI configuration discovered. Root `/test/` is ignored; use `tests/` for future committed tests.

Network pipeline and relevant seams:
1. `denote-explore-network` (`denote-explore.el:1466`) dispatches through `denote-explore-graph-types` (`:222`). It generates a nested alist with `meta`, `nodes`, and `edges`.
2. Sequence generation (`:1209–1276`) chooses matching signatures and constructs parent/child edges with denote-sequence split/join. It does not scan note bodies. Manual explicitly describes this distinction (`denote-explore.org:200–218`).
3. Actual link extraction (`denote-explore.el:883`) scans bracketed `denote:ID` links in text notes using xref. “All links” in this plan means the links supported by this extractor, not arbitrary web URLs or file links.
4. Neighborhood traversal (`:1102–1163`) already demonstrates inbound/outbound expansion. Reuse concepts, not repeated whole-directory scans per sequence note: its existing multi-file edge helper can duplicate edges, and its unique-edge path can discard repeated-link weights.
5. JSON serialization is generic (`:1278`); template substitution (`:1421`) embeds the generated data. Browser only knows exported nodes/edges.
6. D3 click (`denote-explore-network.html:338–342`) currently calls `window.open`. Zoom (`:250–264`), simulation (`:418–457`), drag (`:459–475`), and label joins (`:808–823`) provide focus integration points.
7. DOT/GEXF encoders (`denote-explore.el:1283–1382`) need compatibility checks. GraphViz emits file hyperlinks and cannot gain dynamic focus simply from changing the D3 template.

## Graph contract

[tag:sequence_context_scope] Let U be eligible files after Denote exclusions, text-only policy, and denote-explore ignore regexp; S ⊆ U be the selected sequence; L be actual directed links with both endpoints in U; H be selected sequence hierarchy edges.

- V0 = S.
- V(k+1) = Vk ∪ every source or target of a link in L touching Vk.
- Requested depth d selects Vd. This is multi-source breadth-first expansion from every member of S. Hierarchy distance does not consume context depth.
- At d=0: output S and H only, preserving hierarchy-only meaning.
- At d>0: output Vd and H plus all L edges whose endpoints are in Vd.
- Every selected sequence note remains, even if it has no actual links. A singleton sequence must work in context mode; existing sequence helper currently rejects a root with no children.
- Cycles terminate via visited IDs; expansion stops early when frontier is empty.
- Every edge endpoint resolves to an exported node. Missing targets, excluded files, and disallowed attachments cannot reappear during expansion.
- Count repeated actual source→target links once per occurrence in the source scan, not once per traversal visit. Preserve their weight.
- Distinguish hierarchy versus actual-link relationships even when they share endpoints. Use additive metadata, e.g. node `sequenceMember` / `contextDistance`, edge `kind`, stable relation key. Final names can follow existing alist conventions.
- Existing degree/backlink helpers count graph relationships, not necessarily actual-note links. Context graphs must label or separate actual-link statistics from hierarchy relationships; do not advertise synthetic parentage as document backlinks. Typed parallel relationships also require revisiting displayed density rather than applying the existing simple-graph formula blindly.

Example fixture: sequence A→B→C (hierarchy), actual links X→A, B→Y, Z→X, and unrelated W. At depth 1, show A/B/C/X/Y, including incoming X→A. At depth 2, add Z. W stays absent. Clicking X highlights its exported incident links, not an unexported neighborhood.

## UI design

Preserve current visual language; refine graph exploration rather than redesign page.

[tag:sequence_hero_identity] Persistent sequence identity is independent of temporary clicked-node selection.
- Keep file-type fill colors; use a clear sequence outline/halo and persistent sequence labels, with a distinct stronger selected-node ring.
- Keep sequence members prominent; context nodes and actual-link edges visually secondary. Use line pattern/weight and legend, not only color, to distinguish hierarchy from actual links.
- Initial view frames the sequence group. Start with restrained context forces/placement so highly connected external nodes do not dominate the hero group; no strict tree-layout engine in this scope.
- Render parallel hierarchy/link relationships and reciprocal links legibly, with stable keys and curved/offset paths where necessary. Arrowheads must match edge highlight colors and direction.
- Clicking pans selected node into the visible SVG center, accounting for viewBox, current zoom, and sidebar dimensions; preserve current zoom level and node coordinates. Do not pin or restart simulation merely to focus.
- Highlight selected node, direct incoming/outgoing edges, and their neighboring nodes; subdue unrelated elements without hiding them. Keep base hierarchy/sequence styles recoverable.
- Maintain `selectedNodeId` outside DOM styles. Normalize endpoints as IDs because D3 mutates link endpoints from strings to objects.
- Selection survives label-density changes. Ensure selected label remains visible; remove unnecessary simulation restarts from label-only updates if safe and covered by tests.
- Ordinary pan/drag remains available; click after drag must not select accidentally. Pan animation can be interrupted by user input. Focus is not a camera-lock that fights subsequent dragging.
- Escape or clear-focus control restores base styles. If a selected isolated node is hidden, clear selection consistently. Avoid expanding into a generic filter-system rewrite.
- Provide keyboard activation (Enter/Space), focus indication, accessible node names, and concise selected-node status. Respect reduced-motion preferences.
- Newly added status uses safe text insertion; do not expand existing raw-HTML rendering surface. Broad sidebar security rewrite is outside this feature.

## Implementation sequence

### 1. Failing tests and schema decisions
Main agent creates failing tests before implementation delegation.
- Add ERT fixtures under `tests/`, covering sequence membership, incoming-only neighbors, depths 0/1/2, cycles, singleton roots, missing targets, exclusions, text-only attachments, repeated links, reciprocal edges, and hierarchy+link overlap.
- Cover actual sequence-scheme boundaries: avoid mistaking a raw textual signature prefix for structural ancestry (e.g. 1 versus 10 where the scheme treats them separately). Verify using installed denote-sequence rather than inventing a parser.
- Add small browser test harness with deterministic embedded fixture data and local D3, covering selection and zoom behavior. Avoid adding a frontend build framework.
- Pin graph metadata/statistics semantics and regeneration compatibility before changing helpers.

### 2. Context generation and saved options
- Add documented context-depth customization/prompt; keep universal argument meaning text-only.
- Extend sequence generation with backward-compatible optional arguments or a sequence-parameter normalization helper.
- Scan eligible note links once per generation; build ID→file and adjacency indexes; BFS from S. Do not invoke single-note neighborhood traversal separately for every sequence member.
- Preserve raw-link weights and add relation kinds only at a layer that retains them. Existing `--network-count-edges` reconstructs only source/target/weight, so blindly passing typed edges through it loses kind.
- Store root and depth for regeneration. Accept legacy `("Sequence" root)` and existing direct two-argument sequence-graph callers. Derive metadata from explicit inputs, not incidental `denote-explore-network-previous` state.
- Handle empty selections and singleton sequences deliberately. Show requested depth and loaded counts. No silent node truncation: measure performance, warn about large expansions, and stop traversal when exhausted.

### 3. Hero/context rendering
- Consume additive node/edge metadata with legacy fallbacks for old JSON and other graph types.
- Implement base sequence/context styling, legend, initial framing, edge geometry/markers, and honest statistics labels.
- Verify external hubs do not visually eclipse sequence. Depth is a graph-generation setting, not a promise of readable unlimited density.

### 4. Click focus
- Replace `window.open` path with selection, pan, and incident-edge highlight.
- Integrate state with label joins, drag, isolated-node hiding, sidebar sizing, and keyboard controls.
- Prove node activation produces no popup or document navigation; retain normal browser launch of the generated graph itself.

### 5. Compatibility, documentation, validation
- Keep existing graph types functional. DOT/GEXF must serialize expanded topology without errors; interactive focus is D3-only. Rich semantic styling parity in static exporters is not included.
- Document custom templates: old templates can ignore additive fields, but need updates to gain hero/focus behavior. Existing generated HTML must be regenerated.
- Update Lisp docstrings, `denote-explore.org`, README options/changelog; establish the actual manual export procedure before regenerating `.texi`/`.info`.
- Run ERT, Lisp syntax/byte compilation with dependencies, JS syntax/browser tests, and DOT/GEXF smoke validation. Inspect one representative large graph and one dense expanded sequence in a controlled test browser.
- Run independent full-change review after implementation batch. Main agent owns final commits; no Beads issues until user requests them.

## Acceptance checklist

- [ ] Depth 0 preserves hierarchy-only semantics; depths 1 and 2 match fixture contract.
- [ ] Every sequence member seeds expansion; incoming-only links are included.
- [ ] Ignore/text-only policies hold at every hop, with no dangling edges.
- [ ] Actual link weights and hierarchy semantics remain separate and correct.
- [ ] Sequence remains identifiable before and after clicking an external node.
- [ ] Click centers view at current zoom and highlights both directions; no popup/navigation, no coordinate mutation from focus.
- [ ] Keyboard, reduced motion, drag suppression, labels, clear focus, sidebar resize, and isolated-node hiding work together.
- [ ] Regeneration remembers root/depth and accepts legacy saved parameters.
- [ ] Other graph types and exporters remain valid; custom-template limitations documented.

## Boundaries and estimate

See `estimate.md`. Expected delivery is several days, not a template-only click-handler tweak. No live neighborhood fetching, browser depth slider, strict tree layout, Emacs RPC, arbitrary link-syntax expansion, full sidebar rewrite, or dynamic focus for GraphViz/GEXF is included.

This plan is ready for approval, not an implementation authorization. Unconfirmed defaults above can be changed before work starts.
