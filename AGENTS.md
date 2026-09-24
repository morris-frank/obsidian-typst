# Working agreement — typst-studio

An Obsidian plugin (desktop-only) to view/compile Typst files and export
Markdown to PDF through Typst.

## Golden rules

1. **The bundle is generated.** `main.js` is built from `src/` by esbuild; never
   hand-edit it. It's gitignored — CI and consumers build it.
2. **Desktop-only, on purpose.** The plugin shells out to `typst`, `pandoc` and
   `mmdc` (mermaid-cli, for ` ```mermaid ` fences) via Node `child_process`.
   `manifest.json` sets `isDesktopOnly: true`; keep it so. Node APIs
   (`node:child_process`, `node:fs`, `node:path`, `node:os`) are fine.
3. **One definition of checks.** The prek hooks are the format/lint/typecheck
   gate; CI runs the same hooks plus the build, a gitleaks scan and the audit,
   and `mise run check` runs exactly those steps. Don't add a CI step that
   differs.
4. **mise owns the toolchain.** `node`, `pnpm`, `typst`, `pandoc`, `prek`,
   `gitleaks`, `osv-scanner` and `npm:@mermaid-js/mermaid-cli` are pinned in
   `mise.toml`. Don't duplicate versions into hooks or CI.
5. **Provenance in the pipeline.** Compilation is explicit and inspectable: for
   Markdown we strip frontmatter, run pandoc, then wrap in the template. Keep the
   generated wrapper `.typ` readable and clean it up after compiling.
6. **An optional binary degrades, it never fails the export.** `mmdc` renders
   ` ```mermaid ` fences to SVG (`renderMermaid` in `src/compiler.ts`); a
   missing or broken one leaves the fence as a code block and reports it in a
   notice. Mermaid must be configured with `htmlLabels: false` at the _top
   level_ of the config, not only under `flowchart` — otherwise labels land in
   `<foreignObject>`, which Typst cannot render, and the diagram comes out as
   empty boxes.

## Layout

| Path                              | Role                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                     | Plugin entry: commands, ribbon, file-menu, export orchestration.                                                             |
| `src/compiler.ts`                 | Pure-ish compile logic: `.typ` direct, `.md` via pandoc, mermaid via `mmdc`; `--root`/import-path math. No Obsidian imports. |
| `src/template.typ`                | Bundled default Markdown export template; a replacement must define the same names the pipeline calls.                       |
| `src/typ.d.ts`                    | Module declaration so `.typ` imports (inlined as text by esbuild) type-check.                                                |
| `src/view.ts`                     | `TypstView` — split source/preview editor for `.typ`.                                                                        |
| `src/settings.ts`                 | Settings type, defaults, settings tab.                                                                                       |
| `styles.css`                      | View styling (uses Obsidian CSS variables).                                                                                  |
| `manifest.json` / `versions.json` | Obsidian plugin metadata.                                                                                                    |
| `esbuild.config.mjs`              | Bundler. Loads `.typ` as text; externalizes `obsidian`, electron, CM, and Node builtins (incl. `node:` forms).               |

## Commands

```sh
mise run setup     # cold start
mise run dev       # watch-build
mise run build     # typecheck + production bundle
mise run check     # everything CI runs: prek hooks, build, gitleaks, audit
```

## Definition of done

`mise run check` is green (prek hooks, build, secret scan, audit), and any
change to the compile pipeline is verified by actually compiling a `.typ` and a
`.md` sample to PDF — not just by the type-checker.
