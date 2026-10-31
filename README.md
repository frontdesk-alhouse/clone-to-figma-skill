# clone-to-figma

A Claude Code harness that clones a live website into **Figma** through a closed generator/evaluator loop: verified fidelity, not a one-shot guess.

## How it works

```
/clone-to-figma https://example.com
```

| Phase | Agent | What happens |
|---|---|---|
| 0 · Setup | — | Resolves (or creates) the Figma file with `Reference` and `Build` pages. |
| 1 · Recon | `figma-clone-recon` | Drives Chrome through the site once: design tokens, computed CSS per component, image slots, and a mandatory scroll/click/hover/responsive sweep so scroll-driven behavior is never rebuilt as click-driven. Writes one spec per section. |
| 2 · Reference | — | Captures the live page into the `Reference` page with `generate_figma_design` (falls back to Chrome screenshots if Playwright MCP isn't connected). |
| 3 · Loop | `figma-clone-generator` ↔ `figma-clone-evaluator` | Per section: build with real Variables, score against a fidelity rubric (deterministic property diffs + screenshot checks), feed back, repeat until the threshold or a plateau. |
| 3.5 · Assembly | `figma-clone-generator` | One pass over the whole page for inter-section rhythm and auto-layout chain integrity. |
| 4 · Report | — | `figma-clone-harness/fidelity-report.md` with score progression, behaviors Figma can't execute (annotated with the real implementation recipe), and open issues. |

Options: `--figma-file <url>`, `--max-iterations N` (default 4), `--pass-threshold N` (default 8.0), `--skip-reference-capture`, `--granularity section|page`.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- **Figma MCP** (remote server, with the official Figma plugin skills: `figma:figma-use`, `figma:figma-generate-design`, `figma:figma-create-new-file`)
- **Claude in Chrome** extension (recon)
- Optional: Playwright MCP, for native reference capture of external URLs

## Install

```bash
git clone https://github.com/frontdesk-alhouse/clone-to-figma-skill.git
cd clone-to-figma-skill
./install.sh
```

Copies `commands/clone-to-figma.md` and the three agents into `~/.claude/`, plus the slot-classification test to `~/.claude/tests/clone-to-figma/`, and runs it.

## Tests

```bash
node tests/slot-rules.test.mjs
```

The image-slot classification rules live inside the recon agent's extraction script and are duplicated in this test on purpose: change a threshold in one, change it in the other in the same edit.

## License

MIT — see [LICENSE](LICENSE).
