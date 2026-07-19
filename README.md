# Obsidian Typst

An Obsidian plugin for working with [Typst](https://typst.app) from inside your
vault:

- **View and compile `.typ` files** in a split editor — source on the left, a
  live PDF preview on the right. Hit _Compile_ (or `Cmd/Ctrl+S`) to render.
- **Export Markdown notes to PDF through Typst.** A note is converted to Typst
  (via pandoc), wrapped in a configurable template, and compiled to PDF.
- **Configure a template** in settings — point it at a `.typ` template file or a
  directory containing one. Defaults to the Soilytix `soilytix-document`
  template.

Desktop only: the plugin shells out to the `typst` and `pandoc` binaries.

## Requirements

- [Typst CLI](https://github.com/typst/typst) — for compilation.
- [Pandoc](https://pandoc.org) — only for the Markdown → PDF export.

Both must be installed and either on your `PATH` or set explicitly in the
plugin settings.

## How it works

| Source | Pipeline                                                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.typ` | `typst compile` directly. Imports are resolved with `--root` set to the common ancestor of the file and the configured template, so a note can `#import` the template from anywhere on disk. |
| `.md`  | strip YAML frontmatter → `pandoc --from markdown --to typst` → wrap in `#import "<template>": *` + `#show: <fn>.with(<args>)` → `typst compile`.                                             |

Frontmatter keys are mapped into the template's `.with(...)` call:

| Frontmatter            | Template argument           |
| ---------------------- | --------------------------- |
| `title`                | `title: [...]`              |
| `subtitle`             | `subtitle: "..."`           |
| `eyebrow` / `category` | `eyebrow: "..."`            |
| `author`               | `meta: (("Author", ...),)`  |
| `date`                 | `meta: (("Date", ...),)`    |
| `version`              | `meta: (("Version", ...),)` |

Anything in the **Template arguments** setting (e.g. `accent: "mint",
pattern: "milbe"`) is appended and wins on conflict.

## Settings

- **Typst binary** / **Pandoc binary** — executable paths (default: on `PATH`).
- **Template path** — a `.typ` file or a directory containing one.
- **Template function** — the show-rule function (default `soilytix-document`).
- **Template arguments** — extra Typst args injected into `.with(...)`.
- **Output directory** — where PDFs go (empty = alongside the source).
- **Open PDF after compile** — open in the system viewer when done.
- **Open `.typ` files in the Typst editor** — the split source/preview view.

## Usage

- Open any `.typ` file → the split editor opens. Edit, then _Compile_.
- With a `.md` or `.typ` file active, run **Typst: Export current file to PDF**
  from the command palette, click the ribbon icon, or right-click the file in
  the explorer.

## Development

```sh
mise run setup     # install toolchain + deps + git hooks, then verify
mise run dev       # watch-build main.js
mise run check     # format-check, lint, typecheck, production build
```

To test in a real vault, symlink or copy this folder into
`<vault>/.obsidian/plugins/obsidian-typst/` (it needs `main.js`,
`manifest.json`, `styles.css`), then enable the plugin. Create an empty
`.hotreload` file in the plugin folder and install the
[Hot-Reload](https://github.com/pjeby/hot-reload) plugin for live rebuilds.

## License

MIT
