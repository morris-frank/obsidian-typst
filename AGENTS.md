# Working agreement — typst-studio

An Obsidian plugin (desktop-only) to view/compile Typst files and export
Markdown to PDF through Typst.

## Golden rules

1. **The bundle is generated.** `main.js` is built from `src/` by esbuild; never
   hand-edit it. It's gitignored — CI and consumers build it.
2. **Desktop-only, on purpose.** The plugin shells out to `typst`/`pandoc` via
   Node `child_process`. `manifest.json` sets `isDesktopOnly: true`; keep it so.
   Node APIs (`node:child_process`, `node:fs`, `node:path`, `node:os`) are fine.
3. **One definition of checks.** The prek hooks are the format/lint/typecheck
   gate; CI runs the same hooks plus the build. Don't add a CI step that differs.
4. **mise owns the toolchain.** `node`, `pnpm`, `typst`, `pandoc`, `prek` are
   pinned in `mise.toml`. Don't duplicate versions into hooks or CI.
5. **Provenance in the pipeline.** Compilation is explicit and inspectable: for
   Markdown we strip frontmatter, run pandoc, then wrap in the template. Keep the
   generated wrapper `.typ` readable and clean it up after compiling.

## Layout

| Path                              | Role                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                     | Plugin entry: commands, ribbon, file-menu, export orchestration.                                         |
| `src/compiler.ts`                 | Pure-ish compile logic: `.typ` direct, `.md` via pandoc; `--root`/import-path math. No Obsidian imports. |
| `src/view.ts`                     | `TypstView` — split source/preview editor for `.typ`.                                                    |
| `src/settings.ts`                 | Settings type, defaults, settings tab.                                                                   |
| `styles.css`                      | View styling (uses Obsidian CSS variables).                                                              |
| `manifest.json` / `versions.json` | Obsidian plugin metadata.                                                                                |
| `esbuild.config.mjs`              | Bundler. Externalizes `obsidian`, electron, CM, and Node builtins (incl. `node:` forms).                 |

## Commands

```sh
mise run setup     # cold start
mise run dev       # watch-build
mise run build     # typecheck + production bundle
mise run check     # everything CI runs
```

## Definition of done

`mise run check` is green (format, lint, typecheck, build), and any change to
the compile pipeline is verified by actually compiling a `.typ` and a `.md`
sample to PDF — not just by the type-checker.
