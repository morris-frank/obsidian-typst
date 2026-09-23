<img src="brand/icon/icon-obsidian-typst-on-obsidian-512.png" align="left" width="128" hspace="16" alt="Typst Studio icon">

<h3>Typst Studio</h3>

<p>
  <sub>TYPST INSIDE YOUR VAULT</sub>
  <br>
  <strong>Preview and compile <code>.typ</code> files, and export Markdown notes to PDF through a Typst template.</strong>
  <br>
  <br>
  <a href="https://obsidian.md"><img src="https://img.shields.io/badge/Obsidian-plugin-8EDE3D?style=flat-square&amp;labelColor=16211B" alt="Obsidian plugin"></a>
  <a href="https://typst.app"><img src="https://img.shields.io/badge/Typst-compile-8EDE3D?style=flat-square&amp;labelColor=16211B" alt="Typst"></a>
  <img src="https://img.shields.io/badge/Markdown%20%E2%86%92%20PDF-pandoc-1AB172?style=flat-square&amp;labelColor=16211B" alt="Markdown to PDF via pandoc">
  <img src="https://img.shields.io/badge/platform-desktop%20only-EE7931?style=flat-square&amp;labelColor=16211B" alt="Desktop only">
</p>

<br clear="left">

- **View and compile `.typ` files** in a split editor — source on the left, a
  live PDF preview on the right. Hit _Compile_ (or `Cmd/Ctrl+S`) to render.
- **Export Markdown notes to PDF through Typst.** A note is converted to Typst
  (via pandoc), wrapped in a configurable template, and compiled to PDF.
- **Bring your own template** — point the settings at a `.typ` template file
  or a directory containing one. Without one, a small bundled template is used.

Desktop only: the plugin shells out to the `typst`, `pandoc` and `mmdc` binaries.

## Requirements

- [Typst CLI](https://github.com/typst/typst) — for compilation.
- [Pandoc](https://pandoc.org) — only for the Markdown → PDF export.
- [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) (`mmdc`) — optional,
  only for ` ```mermaid ` fences. Without it those fences stay code blocks.

They must be installed and either on your `PATH` or set explicitly in the
plugin settings. `mise run setup` installs all three.

## Installation

- **Community plugins:** _Settings → Community plugins → Browse_, search for
  **Typst Studio**, install and enable.
- **Manually:** download `main.js`, `manifest.json` and `styles.css` from the
  [latest release](https://github.com/morris-frank/obsidian-typst/releases/latest)
  into `<vault>/.obsidian/plugins/typst-studio/`, then enable the plugin.

## How it works

| Source | Pipeline                                                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.typ` | `typst compile` directly. Imports are resolved with `--root` set to the common ancestor of the file and the configured template, so a note can `#import` the template from anywhere on disk. |
| `.md`  | strip YAML frontmatter → `pandoc --from markdown --to typst` → wrap in `#import "<template>": *` + `#show: <fn>.with(<args>)` → `typst compile`.                                             |

Four Obsidian constructs pandoc doesn't know about are translated on the way
through, so they survive into the PDF:

- `[[note]]` / `[[note#heading|alias]]` become clickable `obsidian://open`
  links back into the vault, instead of literal `\[\[brackets\]\]`.
- `> [!warning] Title` callouts become `#admonition("warning", title: [Title])`,
  with the body still rendered as Markdown.
- `- [ ]` / `- [x]` task lists are wrapped in the template's `#task-list`,
  which replaces the bullet with a checkbox.
- ` ```mermaid ` fences are rendered to SVG by `mmdc` and embedded as
  figures, in mermaid's neutral theme unless the **Mermaid config** setting
  says otherwise. The SVGs are written beside the note
  (they have to live under the compile root) and deleted afterwards. A fence
  that fails to render is left as a code block and reported in a notice, so a
  broken diagram never fails the export. Diagrams wider than 1.9:1 are allowed
  to pad out into the page margins; anything wider still is more legible
  authored as `flowchart TB`.

Frontmatter keys are mapped into the template's `.with(...)` call:

| Frontmatter            | Template argument           |
| ---------------------- | --------------------------- |
| `title`                | `title: [...]`              |
| `subtitle`             | `subtitle: "..."`           |
| `eyebrow` / `category` | `eyebrow: "..."`            |
| `author`               | `meta: (("Author", ...),)`  |
| `date`                 | `meta: (("Date", ...),)`    |
| `version`              | `meta: (("Version", ...),)` |

`author` falls back to the **Default author** setting when the note's
frontmatter doesn't set one.

Anything in the **Template arguments** setting (e.g. `accent: "deep",
pattern: "milbe"`) is appended and wins on conflict.

## Settings

- **Typst binary** / **Pandoc binary** — executable paths (default: on `PATH`).
- **Mermaid CLI binary** — path to `mmdc`. Empty leaves mermaid fences as code.
- **Mermaid config** — JSON merged over the default mermaid config (theme,
  `themeVariables`, …). `htmlLabels` is always forced off so Typst can render
  the labels.
- **Browser for Mermaid** — Chrome/Chromium for mermaid-cli to render in. Empty
  uses puppeteer's own, which needs a `puppeteer browsers install` download.
- **Template path** — a `.typ` file or a directory containing one. Empty uses
  the bundled template.
- **Template function** — your template's show-rule function (ignored for the
  bundled one).
- **Template arguments** — extra Typst args injected into `.with(...)`.
- **Default author** — shown in the header unless frontmatter sets `author:`.
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
`<vault>/.obsidian/plugins/typst-studio/` (it needs `main.js`,
`manifest.json`, `styles.css`), then enable the plugin. Create an empty
`.hotreload` file in the plugin folder and install the
[Hot-Reload](https://github.com/pjeby/hot-reload) plugin for live rebuilds.

## Custom templates

The Markdown export emits calls to four names, so a template must define all
of them (see [`src/template.typ`](src/template.typ) for the bundled version):

- the show-rule function, taking `title`, `subtitle`, `eyebrow`, `meta` and the
  body;
- `admonition(kind, title: none, body)` for callouts;
- `task-list(body)` for task lists;
- `styled-enum-numbering(pattern)` for lettered/roman lists.

## Releasing

```sh
npm version 0.2.0         # bumps package.json, manifest.json, versions.json
git push --follow-tags    # the tag triggers the Release workflow
```

The workflow builds and attaches `main.js`, `manifest.json` and `styles.css` to
a draft GitHub release; publish it from the Releases page.

## License

[MIT](LICENSE) © Maurice Frank
