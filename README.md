<img src="brand/icon/icon-typst-studio-on-obsidian-512.png" align="left" width="128" hspace="16" alt="typst-studio icon">

<h3>typst-studio</h3>

<p>
  <sub>TYPST INSIDE YOUR VAULT</sub>
  <br>
  <strong>Edit and preview <code>.typ</code> files in Obsidian, and export Markdown notes to PDF through a Typst template.</strong>
  <br>
  <br>
  <a href="https://github.com/morris-frank/typst-studio/releases/latest"><img src="https://img.shields.io/github/v/release/morris-frank/typst-studio?style=flat-square&amp;color=D78A7A&amp;labelColor=2D2825" alt="Latest release"></a>
  <a href="https://obsidian.md"><img src="https://img.shields.io/badge/Obsidian-plugin-D78A7A?style=flat-square&amp;labelColor=2D2825" alt="Obsidian plugin"></a>
  <a href="https://typst.app"><img src="https://img.shields.io/badge/Typst-compile-D78A7A?style=flat-square&amp;labelColor=2D2825" alt="Typst"></a>
  <img src="https://img.shields.io/badge/Markdown%20%E2%86%92%20PDF-pandoc-7E9688?style=flat-square&amp;labelColor=2D2825" alt="Markdown to PDF via pandoc">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-7E9688?style=flat-square&amp;labelColor=2D2825" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/platform-desktop%20only-A78D73?style=flat-square&amp;labelColor=2D2825" alt="Desktop only">
</p>

<br clear="left">

A `.typ` file opens in a split editor: source on the left, the compiled PDF on the right,
re-rendered on _Compile_ or `Cmd/Ctrl+S`. A Markdown note is converted by pandoc, wrapped
in a Typst template and compiled to PDF, with wiki links, callouts, task lists and mermaid
diagrams carried across. Without a template of your own, a small bundled one is used.

The plugin shells out to local binaries, which is why it is desktop only:

| Binary                                              | Needed for                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| [`typst`](https://github.com/typst/typst)           | everything                                                        |
| [`pandoc`](https://pandoc.org)                      | Markdown → PDF                                                    |
| [`mmdc`](https://github.com/mermaid-js/mermaid-cli) | ` ```mermaid ` fences; optional, they stay code blocks without it |

Each must be on your `PATH` or set in the plugin settings.

## Install

In Obsidian, _Settings → Community plugins → Browse_, search for **Typst Studio** and enable
it. Or download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/morris-frank/typst-studio/releases/latest) into
`<vault>/.obsidian/plugins/typst-studio/`.

## Export

Run **Typst Studio: Export current file to PDF** from the command palette, the ribbon icon,
or a file's context menu. A `.typ` file is compiled as-is, with `--root` set to the common
ancestor of the file and the configured template so it can `#import` the template from
anywhere on disk. A `.md` note goes through:

```
strip frontmatter → pandoc --to typst → #import "<template>": * → #show: <fn>.with(<args>) → typst compile
```

The wrapper `.typ` and any diagram SVGs are written beside the note (they must sit under the
compile root) and deleted afterwards. On the way through, four Obsidian constructs are
translated so they survive into the PDF:

| In the note               | In the PDF                                                               |
| ------------------------- | ------------------------------------------------------------------------ |
| `[[note#heading\|alias]]` | a clickable `obsidian://open` link back into the vault                   |
| `> [!warning] Title`      | `#admonition("warning", title: [Title])`, body still Markdown            |
| `- [ ]` / `- [x]`         | `#task-list[...]`, a checkbox instead of a bullet                        |
| ` ```mermaid `            | an SVG figure rendered by `mmdc`; wider than 1.9:1 pads into the margins |

A fence that fails to render stays a code block and is reported in a notice; a broken
diagram never fails the export.

Frontmatter becomes template arguments. The **Template arguments** setting is appended after
these and wins on conflict:

| Frontmatter                        | Argument                    |
| ---------------------------------- | --------------------------- |
| `title`                            | `title: [...]`              |
| `subtitle`                         | `subtitle: "..."`           |
| `eyebrow` / `category`             | `eyebrow: "..."`            |
| `author` (else **Default author**) | `meta: (("Author", ...),)`  |
| `date`                             | `meta: (("Date", ...),)`    |
| `version`                          | `meta: (("Version", ...),)` |

## Settings

| Setting                               | Default            |                                                                                  |
| ------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Typst / Pandoc binary                 | `typst` / `pandoc` | executable path, or the name on `PATH`                                           |
| Mermaid CLI binary                    | `mmdc`             | empty leaves mermaid fences as code                                              |
| Browser for Mermaid                   | —                  | Chrome/Chromium for mmdc; empty uses puppeteer's own download                    |
| Mermaid config                        | —                  | JSON merged over the neutral theme; `htmlLabels` is always forced off            |
| Template path                         | —                  | a `.typ` file or a directory holding one; empty uses the bundled template        |
| Template function                     | —                  | your template's show-rule function; ignored for the bundled one                  |
| Template arguments                    | —                  | extra Typst args for `.with(...)`                                                |
| Default author                        | —                  | used when frontmatter has no `author:`                                           |
| Output directory                      | —                  | empty writes the PDF beside the source; relative paths resolve against the vault |
| Open PDF after compile                | on                 | opens in the system viewer                                                       |
| Open `.typ` files in the Typst editor | on                 | the split view; needs a restart                                                  |

## Templates

The Markdown export emits calls to four names, so a template must define all of them.
[`src/template.typ`](src/template.typ) is the bundled version:

| Name                                  | Called for                                                       |
| ------------------------------------- | ---------------------------------------------------------------- |
| the show-rule function                | the document; takes `title`, `subtitle`, `eyebrow`, `meta`, body |
| `admonition(kind, title: none, body)` | callouts                                                         |
| `task-list(body)`                     | task lists                                                       |
| `styled-enum-numbering(pattern)`      | lettered and roman lists                                         |

## Development

```sh
mise run setup    # toolchain, deps, git hooks, verify
mise run dev      # watch-build main.js
mise run check    # what CI runs: format, lint, typecheck, build
```

Symlink this directory to `<vault>/.obsidian/plugins/typst-studio/` and enable the plugin.
An empty `.hotreload` file plus the [Hot-Reload](https://github.com/pjeby/hot-reload) plugin
reloads it on every rebuild.

## Release

```sh
npm version 0.2.0         # bumps package.json, manifest.json, versions.json; tags without a v
git push --follow-tags    # the tag builds a draft GitHub release with the plugin files
```

Publish the draft from the Releases page once reviewed.

## License

MIT
