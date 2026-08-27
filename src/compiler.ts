import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { TypstPluginSettings } from "./settings";

export class CompileError extends Error {}

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Spawn a process, optionally piping `input` to stdin, and collect output. */
function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; input?: string } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      reject(
        new CompileError(
          `Failed to run \`${cmd}\`: ${err.message}. Is it installed and is the path in settings correct?`,
        ),
      );
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (opts.input !== undefined) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
  });
}

/** Deepest directory that is an ancestor of every given absolute path. */
export function commonAncestor(paths: string[]): string {
  const dirs = paths.map((p) => path.dirname(path.resolve(p)).split(path.sep));
  const first = dirs[0];
  const out: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const seg = first[i];
    if (dirs.every((d) => d[i] === seg)) out.push(seg);
    else break;
  }
  const joined = out.join(path.sep);
  return joined === "" ? path.sep : joined;
}

/** Resolve a template path (file or directory) to a concrete `.typ` file. */
export async function resolveTemplateFile(
  templatePath: string,
): Promise<string> {
  const abs = path.resolve(templatePath);
  const stat = await fs.stat(abs).catch(() => {
    throw new CompileError(`Template path does not exist: ${abs}`);
  });
  if (stat.isFile()) return abs;
  // Directory: prefer assets/<fn>.typ, else the first .typ we find.
  const candidates: string[] = [];
  const walk = async (dir: string, depth: number) => {
    if (depth > 2) return;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (entry.name.endsWith(".typ")) candidates.push(full);
    }
  };
  await walk(abs, 0);
  if (candidates.length === 0)
    throw new CompileError(`No .typ template found under: ${abs}`);
  // Prefer one whose basename matches the directory name (e.g. soilytix-document.typ).
  const dirName = path.basename(abs);
  return (
    candidates.find((c) => path.basename(c, ".typ") === dirName) ??
    candidates.sort((a, b) => a.length - b.length)[0]
  );
}

/**
 * A root-relative Typst import path (starting with `/`) for `target`, given
 * that Typst is invoked with `--root root`. Handles the case where the target
 * lives outside the compiled file's own directory.
 */
function rootRelativeImport(root: string, target: string): string {
  const rel = path.relative(root, path.resolve(target));
  return "/" + rel.split(path.sep).join("/");
}

function typstStringLiteral(value: string): string {
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** Escape a value for use as Typst content inside `[...]`. */
function typstContent(value: string): string {
  return value.replace(/([\\#\[\]])/g, "\\$1");
}

/** Build the `.with(...)` argument string from frontmatter + user settings. */
function buildTemplateArgs(
  frontmatter: Record<string, unknown>,
  extraArgs: string,
): string {
  const parts: string[] = [];
  const fm = frontmatter ?? {};

  const str = (v: unknown) => (v == null ? undefined : String(v));
  const title = str(fm.title);
  const subtitle = str(fm.subtitle);
  const eyebrow = str(fm.eyebrow ?? fm.category);

  if (title) parts.push(`title: [${typstContent(title)}]`);
  if (subtitle) parts.push(`subtitle: ${typstStringLiteral(subtitle)}`);
  if (eyebrow) parts.push(`eyebrow: ${typstStringLiteral(eyebrow)}`);

  const meta: Array<[string, string]> = [];
  if (fm.author) meta.push(["Author", String(fm.author)]);
  if (fm.date) meta.push(["Date", String(fm.date)]);
  if (fm.version) meta.push(["Version", String(fm.version)]);
  if (meta.length) {
    const rows = meta
      .map(([k, v]) => `(${typstStringLiteral(k)}, ${typstStringLiteral(v)})`)
      .join(", ");
    // Trailing comma is required: `(("Date", "x"))` is not a nested array in
    // Typst, it collapses to `("Date", "x")` and the template reads characters.
    parts.push(`meta: (${rows},)`);
  }

  if (extraArgs.trim()) parts.push(extraArgs.trim().replace(/,\s*$/, ""));
  return parts.join(",\n  ");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Rewrite bare imports of the configured template to a root-relative absolute
 * path pointing at its real location, so a `.typ` file can `#import
 * "soilytix-document.typ"` from anywhere without the template sitting next to
 * it. Only imports whose basename matches the resolved template file are
 * touched; every other import is left alone. The template's own asset paths
 * (logo, patterns) resolve relative to its real location, so they keep working.
 */
export function rewriteTemplateImports(
  source: string,
  templateFile: string,
  root: string,
): { source: string; changed: boolean } {
  const templateBase = path.basename(templateFile);
  const rootRel = rootRelativeImport(root, templateFile);
  let changed = false;
  const rewritten = source.replace(
    /(#(?:import|include)\s+)"([^"]+)"/g,
    (whole, keyword: string, importPath: string) => {
      if (path.basename(importPath) !== templateBase) return whole;
      if (importPath === rootRel) return whole;
      changed = true;
      return `${keyword}"${rootRel}"`;
    },
  );
  return { source: rewritten, changed };
}

/**
 * Compile a `.typ` file directly to PDF. Returns the output path.
 *
 * If the file imports the configured template by a bare/mismatched path, that
 * import is rewritten to the template's real location and the compile runs from
 * a temporary sibling file (so the original's other relative paths still
 * resolve). `--root` is the common ancestor of the source and the template so
 * the root-relative import is expressible.
 */
export async function compileTyp(
  sourceAbs: string,
  outPdfAbs: string,
  settings: TypstPluginSettings,
): Promise<string> {
  await ensureDir(path.dirname(outPdfAbs));

  let templateFile: string | null = null;
  if (settings.templatePath) {
    try {
      templateFile = await resolveTemplateFile(settings.templatePath);
    } catch {
      // Template optional for direct .typ compiles; ignore if unresolved.
    }
  }

  const roots = templateFile ? [sourceAbs, templateFile] : [sourceAbs];
  const root = commonAncestor(roots);

  let compileTarget = sourceAbs;
  let tmpTyp: string | null = null;

  if (templateFile) {
    const original = await fs.readFile(sourceAbs, "utf8");
    const { source, changed } = rewriteTemplateImports(
      original,
      templateFile,
      root,
    );
    if (changed) {
      tmpTyp = path.join(
        path.dirname(sourceAbs),
        `.${path.basename(sourceAbs, ".typ")}.typst-compile.typ`,
      );
      await fs.writeFile(tmpTyp, source, "utf8");
      compileTarget = tmpTyp;
    }
  }

  try {
    const res = await run(
      settings.typstPath,
      ["compile", "--root", root, compileTarget, outPdfAbs],
      { cwd: path.dirname(sourceAbs) },
    );
    if (res.code !== 0) {
      throw new CompileError(res.stderr.trim() || "typst compile failed.");
    }
  } finally {
    if (tmpTyp) await fs.rm(tmpTyp, { force: true });
  }
  return outPdfAbs;
}

/**
 * Convert a Markdown file to Typst body via pandoc, wrap it in the configured
 * template, compile to PDF. Returns the output path.
 */
export async function compileMarkdown(
  sourceAbs: string,
  sourceMarkdown: string,
  frontmatter: Record<string, unknown>,
  outPdfAbs: string,
  settings: TypstPluginSettings,
): Promise<string> {
  if (!settings.templatePath)
    throw new CompileError(
      "No template configured. Set a template path in the plugin settings.",
    );

  const templateFile = await resolveTemplateFile(settings.templatePath);
  await ensureDir(path.dirname(outPdfAbs));

  // Strip YAML frontmatter before handing to pandoc (we map it ourselves).
  const body = sourceMarkdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const pandoc = await run(
    settings.pandocPath,
    ["--from=markdown", "--to=typst", "--wrap=preserve"],
    { input: body, cwd: path.dirname(sourceAbs) },
  );
  if (pandoc.code !== 0)
    throw new CompileError(pandoc.stderr.trim() || "pandoc conversion failed.");

  // The wrapper .typ lives next to the source so relative image paths resolve.
  const tmpTyp = path.join(
    path.dirname(sourceAbs),
    `.${path.basename(sourceAbs, path.extname(sourceAbs))}.typst-export.typ`,
  );
  const root = commonAncestor([tmpTyp, templateFile]);
  const importPath = rootRelativeImport(root, templateFile);
  const args = buildTemplateArgs(frontmatter, settings.templateArgs);

  const wrapper = [
    `#import ${typstStringLiteral(importPath)}: *`,
    "",
    `#show: ${settings.templateFunction}.with(`,
    `  ${args}`,
    `)`,
    "",
    pandoc.stdout,
  ].join("\n");

  await fs.writeFile(tmpTyp, wrapper, "utf8");
  try {
    const res = await run(
      settings.typstPath,
      ["compile", "--root", root, tmpTyp, outPdfAbs],
      { cwd: path.dirname(sourceAbs) },
    );
    if (res.code !== 0)
      throw new CompileError(res.stderr.trim() || "typst compile failed.");
  } finally {
    await fs.rm(tmpTyp, { force: true });
  }
  return outPdfAbs;
}

/** Compile a `.typ` file to a temporary PDF and return its bytes (for preview). */
export async function compileTypToBuffer(
  sourceAbs: string,
  settings: TypstPluginSettings,
): Promise<ArrayBuffer> {
  const tmpPdf = path.join(
    os.tmpdir(),
    `typst-preview-${path.basename(sourceAbs, ".typ")}.pdf`,
  );
  await compileTyp(sourceAbs, tmpPdf, settings);
  const bytes = await fs.readFile(tmpPdf);
  await fs.rm(tmpPdf, { force: true });
  // Copy into a standalone ArrayBuffer so it's a valid BlobPart.
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}
