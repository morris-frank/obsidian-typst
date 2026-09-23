import esbuild from "esbuild";
import process from "node:process";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";

const banner = `/*
This file is bundled by esbuild from src/. Do not edit directly.
See the source at https://github.com/morris-frank/obsidian-typst
*/`;

const ctx = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  // The bundled default template ships inside main.js as a string.
  loader: { ".typ": "text" },
  // Obsidian ships these; never bundle them.
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
    // builtin-modules omits the `node:` prefix form; add it explicitly.
    ...builtins.map((m) => `node:${m}`),
  ],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: production,
});

if (production) {
  await ctx.rebuild();
  process.exit(0);
} else {
  await ctx.watch();
}
