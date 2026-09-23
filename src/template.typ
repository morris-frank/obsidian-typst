// Bundled default template for Markdown -> PDF export. Used when no template
// path is configured. Any replacement template must define the same four
// names: the show-rule function, `admonition`, `task-list` and
// `styled-enum-numbering`, because the export pipeline emits calls to them.

#let _accent = rgb("#2f6f9f")

#let _callout-colors = (
  note: rgb("#2f6f9f"),
  info: rgb("#2f6f9f"),
  tip: rgb("#2e8b57"),
  success: rgb("#2e8b57"),
  question: rgb("#b8860b"),
  warning: rgb("#c77700"),
  caution: rgb("#c77700"),
  danger: rgb("#b03a2e"),
  error: rgb("#b03a2e"),
  bug: rgb("#b03a2e"),
  quote: luma(110),
)

/// An Obsidian callout (`> [!kind] Title`).
#let admonition(kind, title: none, body) = {
  let color = _callout-colors.at(kind, default: _accent)
  let heading = if title == none { upper(kind.first()) + kind.slice(1) } else { title }
  block(
    width: 100%,
    inset: (x: 12pt, y: 10pt),
    radius: 2pt,
    fill: color.lighten(92%),
    stroke: (left: 2.5pt + color),
    breakable: true,
  )[
    #text(weight: "bold", fill: color)[#heading]
    #v(0.2em, weak: true)
    #body
  ]
}

/// A Markdown task list: drops the bullet and draws the checkbox.
#let task-list(body) = {
  let box-mark(done) = box(
    width: 0.8em,
    height: 0.8em,
    baseline: 0.1em,
    stroke: 0.6pt + luma(90),
    radius: 1.5pt,
    if done { align(center + horizon, text(0.7em)[✓]) },
  )
  set list(marker: none, body-indent: 0pt)
  show "☐": box-mark(false) + h(0.35em)
  show "☒": box-mark(true) + h(0.35em)
  body
}

/// Enum numbering hook for lettered/roman lists; kept as-is here.
#let styled-enum-numbering(pattern) = pattern

/// The document show-rule, applied as `#show: template.with(...)`.
#let template(
  title: none,
  subtitle: none,
  eyebrow: none,
  meta: (),
  body,
) = {
  set document(title: if title != none { title })
  set page(paper: "a4", margin: (x: 2.5cm, y: 2.5cm), numbering: "1")
  set text(size: 10.5pt)
  set par(justify: true, leading: 0.65em)
  set heading(numbering: none)
  show heading: set block(above: 1.4em, below: 0.8em)
  show link: set text(fill: _accent)

  if eyebrow != none {
    text(size: 8.5pt, weight: "bold", tracking: 0.08em, fill: _accent, upper(eyebrow))
    v(0.4em, weak: true)
  }
  if title != none {
    text(size: 22pt, weight: "bold", title)
    v(0.5em, weak: true)
  }
  if subtitle != none {
    text(size: 13pt, fill: luma(80), subtitle)
    v(0.6em, weak: true)
  }
  if meta.len() > 0 {
    set text(size: 9pt, fill: luma(90))
    grid(
      columns: (auto, 1fr),
      column-gutter: 1em,
      row-gutter: 0.4em,
      ..meta.map(((k, v)) => (strong(k), v)).flatten()
    )
  }
  if title != none or meta.len() > 0 {
    v(0.6em)
    line(length: 100%, stroke: 0.5pt + luma(200))
    v(0.6em)
  }

  body
}
