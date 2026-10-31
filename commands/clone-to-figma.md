---
description: Clone a live website into Figma via a closed generator/evaluator loop — verified fidelity, not a one-shot guess.
---

Parse the following from $ARGUMENTS:
1. `url` — one or more target URLs (space-separated) to clone
2. `--figma-file <url>` — (optional) an existing Figma file to build into. If omitted, create a new file.
3. `--max-iterations N` — (optional, default 4) maximum generator-evaluator cycles per section
4. `--pass-threshold N` — (optional, default 8.0) weighted score to pass a section
5. `--skip-reference-capture` — (optional) reuse an existing `Reference` page capture instead of re-running `generate_figma_design`
6. `--granularity section|page` — (optional, default `section`) loop per-section with a whole-page finishing pass, or attempt the whole page in one shot (small/simple sites only)

## Clone-to-Figma Harness

Three-phase pipeline: one-pass reconnaissance, native-Figma reference capture, then a closed generator/evaluator loop per section — the same pattern as `/gan-build`, retargeted at a Figma file instead of a live app.

### Phase 0: Setup

1. Create `figma-clone-harness/` in the project root, with `research/components/`, `figma/feedback/`.
2. Resolve the target Figma file:
   - If `--figma-file` was given, use its `fileKey`.
   - Otherwise, load `Skill("figma:figma-create-new-file")`, then `mcp__figma__create_new_file` to create a new design file. Record its `fileKey`.
3. Ensure the file has two pages: `Reference` and `Build` (create them if missing — the Generator/Evaluator agents assume both exist).
4. Log the target URL(s), the resolved `fileKey`, and the configuration (max-iterations, pass-threshold, granularity).

### Phase 1: Reconnaissance (once, not iterative)

1. Launch `figma-clone-recon` via the Task tool with the target URL(s).
2. Wait for it to produce `figma-clone-harness/research/{GLOBAL_TOKENS.md,BEHAVIORS.md,PAGE_TOPOLOGY.md,components/*.spec.md}`.
3. Display a summary to the user: sections found, interaction models identified, token count.

### Phase 2: Reference Capture (once, unless `--skip-reference-capture`)

1. Check whether a Playwright MCP tool is available in the current tool list. `generate_figma_design` on any **external** (non-localhost) URL requires it — it's used internally to strip CSP headers so the capture script can be injected. Without it, the tool's own instructions say not to attempt the fallback hash-URL injection on external sites, because it fails silently.
2. **If Playwright MCP is available**: for each target URL, call `mcp__figma__generate_figma_design` with the resolved `fileKey`, targeting the `Reference` page (poll the returned `captureId` every 5 seconds, up to 10 times, until `status: completed`). Confirm via `mcp__figma__get_metadata` that the capture landed under the `Reference` page as expected. This is the ground truth `figma-clone-evaluator` compares builds against — same file, same renderer, no cross-format noise.
3. **If Playwright MCP is not available**: fall back to **Chrome-screenshot reference mode** — reuse the desktop/mobile screenshots `figma-clone-recon` already captured via `claude-in-chrome` in Phase 1 (`figma-clone-harness/design-references/`) as the ground truth instead of a Figma `Reference` page. Tell `figma-clone-evaluator` which mode is active — its Layout Match and Asset Completeness checks compare the `Build` page screenshot against these Chrome screenshots directly rather than a same-file Figma capture. Lower fidelity than native capture (cross-format comparison again), but keeps the harness usable without Playwright MCP connected. Note this explicitly in the Phase 4 report so the user knows which mode ran.

### Phase 3: Generator-Evaluator Loop (per section)

For each section in `PAGE_TOPOLOGY.md`, in topology order:

```
iteration = 1
while iteration <= max_iterations:

    # GENERATE
    Launch figma-clone-generator via Task tool:
    - Mode: clone
    - Section spec: research/components/<section>.spec.md
    - Target: Build page, fileKey
    - Reference: Reference page, same fileKey
    - If iteration > 1: read figma/feedback/<section>/feedback-{iteration-1}.md

    # EVALUATE
    Launch figma-clone-evaluator via Task tool:
    - Compare Build vs. Reference + spec
    - Score against the Figma Fidelity Rubric
    - Write figma/feedback/<section>/feedback-{iteration}.md

    # CHECK SCORE
    Read feedback-{iteration}.md, extract weighted total

    if score >= pass_threshold:
        Log "<section> PASSED at iteration {iteration} with score {score}"
        break

    if iteration >= 2 and score has not improved since the previous iteration:
        Log "<section> PLATEAU — stopping early at {score}"
        break

    iteration += 1
```

Sections are independent — a hard section plateauing doesn't block a simple one from passing quickly. Run sections in parallel where the harness allows it; otherwise sequentially in topology order.

### Phase 3.5: Whole-Page Assembly (once, not looped)

After every section has individually converged (passed or plateaued):

1. Launch `figma-clone-generator` once more, mode `clone`, scope: whole-page assembly — wire the section frames together per `PAGE_TOPOLOGY.md`'s order and dependencies (inter-section spacing/rhythm, sticky/overlay elements, the auto-layout ancestor chain integrity for any section using `FILL` sizing).
2. `get_screenshot` the full assembled page.
3. This is a single pass, not a loop — it catches page-level bugs (missing inter-section gaps, `primaryAxisSizingMode` not re-hugging after insert) that per-section evaluation can't see, without paying for a second full iteration budget.

### Phase 4: Summary Report

Write `figma-clone-harness/fidelity-report.md`:

```markdown
## Clone-to-Figma Report

**Target(s):** [url(s)]
**Figma file:** [fileKey / link]

### Score Progression
| Section | Iter 1 | Iter 2 | ... | Final | Result |
|---|---|---|---|---|---|
| Hero | ... | ... | | X.X | PASS/PLATEAU |
| ... | | | | | |

### Annotated-Not-Implemented Behaviors
- [section]: [behavior] — Figma can't execute this natively; annotation frame added at [location] with the real-world implementation recipe.

### Remaining Issues (sections that didn't hit threshold)
- [section]: [top unresolved issue from its last feedback file]

### Whole-Page Assembly
- [pass/fail on inter-section rhythm, FILL ancestor-chain integrity]
```

Display the score progression and the Figma file link to the user.
