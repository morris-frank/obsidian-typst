import { App, PluginSettingTab, Setting, normalizePath } from "obsidian";
import type TypstPlugin from "./main";

export interface TypstPluginSettings {
  /** Absolute path to the `typst` binary (or just "typst" if on PATH). */
  typstPath: string;
  /** Absolute path to the `pandoc` binary (or just "pandoc" if on PATH). */
  pandocPath: string;
  /**
   * Absolute path to the `mmdc` binary (mermaid-cli), which renders
   * ```mermaid fences to SVG. Empty, or a binary that cannot run, leaves
   * those fences as code blocks rather than failing the export.
   */
  mermaidPath: string;
  /**
   * Browser executable mermaid-cli renders in. Empty lets puppeteer find its
   * own, which needs a `puppeteer browsers install` download first; pointing
   * this at an installed Chrome avoids that.
   */
  chromePath: string;
  /**
   * JSON merged over the default mermaid config, e.g. a `theme` and
   * `themeVariables` to match a house style. Empty = mermaid's neutral theme.
   */
  mermaidConfig: string;
  /**
   * Path to the Typst template. May be a `.typ` file or a directory that
   * contains a single `.typ` template. Empty uses the bundled template.
   * Used only for the Markdown -> Typst -> PDF pipeline; direct `.typ` files
   * are compiled as-is.
   */
  templatePath: string;
  /** Name of the template show-rule function to apply, ignored for the bundled template. */
  templateFunction: string;
  /**
   * Extra arguments injected verbatim into `#show: <fn>.with( ... )`, e.g.
   * `key: "value"`. Frontmatter-derived args are merged
   * before these, so these win on conflict.
   */
  templateArgs: string;
  /**
   * Author shown in the document header when the note's frontmatter has no
   * `author:` of its own. Empty = no Author line.
   */
  defaultAuthor: string;
  /**
   * Where compiled PDFs are written. Empty = alongside the source file.
   * A relative path is resolved against the vault root.
   */
  outputDir: string;
  /** Open the PDF (in the system viewer) after a successful compile. */
  openAfterCompile: boolean;
  /** Enable the split source/preview editor for `.typ` files. */
  registerTypView: boolean;
}

export const DEFAULT_SETTINGS: TypstPluginSettings = {
  typstPath: "typst",
  pandocPath: "pandoc",
  mermaidPath: "mmdc",
  chromePath: "",
  mermaidConfig: "",
  templatePath: "",
  templateFunction: "",
  templateArgs: "",
  defaultAuthor: "",
  outputDir: "",
  openAfterCompile: true,
  registerTypView: true,
};

export class TypstSettingTab extends PluginSettingTab {
  plugin: TypstPlugin;

  constructor(app: App, plugin: TypstPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Binaries").setHeading();

    new Setting(containerEl)
      .setName("Typst binary")
      .setDesc("Path to the typst executable, or just `typst` if on your PATH.")
      .addText((t) =>
        t
          .setPlaceholder("typst")
          .setValue(this.plugin.settings.typstPath)
          .onChange(async (v) => {
            this.plugin.settings.typstPath = v.trim() || "typst";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Pandoc binary")
      .setDesc(
        "Path to the pandoc executable, used to convert Markdown to Typst. `pandoc` if on your PATH.",
      )
      .addText((t) =>
        t
          .setPlaceholder("pandoc")
          .setValue(this.plugin.settings.pandocPath)
          .onChange(async (v) => {
            this.plugin.settings.pandocPath = v.trim() || "pandoc";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Mermaid CLI binary")
      .setDesc(
        "Path to `mmdc`, used to render ```mermaid fences to SVG. Leave empty to keep them as code blocks.",
      )
      .addText((t) =>
        t
          .setPlaceholder("mmdc")
          .setValue(this.plugin.settings.mermaidPath)
          .onChange(async (v) => {
            this.plugin.settings.mermaidPath = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Browser for Mermaid")
      .setDesc(
        "Chrome/Chromium executable mermaid-cli renders in. Empty lets puppeteer use its own downloaded browser.",
      )
      .addText((t) =>
        t
          .setPlaceholder("(puppeteer's own)")
          .setValue(this.plugin.settings.chromePath)
          .onChange(async (v) => {
            this.plugin.settings.chromePath = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Mermaid config")
      .setDesc(
        'JSON merged over the default mermaid config, e.g. `{"theme": "base", "themeVariables": {"primaryColor": "#eef"}}`. Leave empty for the neutral theme.',
      )
      .addTextArea((t) => {
        t.setPlaceholder("{}")
          .setValue(this.plugin.settings.mermaidConfig)
          .onChange(async (v) => {
            this.plugin.settings.mermaidConfig = v;
            await this.plugin.saveSettings();
          });
        t.inputEl.rows = 4;
        t.inputEl.addClass("typst-settings-textarea");
      });

    new Setting(containerEl).setName("Template").setHeading();

    new Setting(containerEl)
      .setName("Template path")
      .setDesc(
        "A .typ template file, or a directory containing one. Used when exporting Markdown notes to PDF. Leave empty for the bundled template.",
      )
      .addText((t) =>
        t
          .setPlaceholder("/path/to/template.typ or a directory")
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (v) => {
            this.plugin.settings.templatePath = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Template function")
      .setDesc(
        "The show-rule function of your template, applied via `#show: <fn>.with(...)`. Ignored for the bundled template.",
      )
      .addText((t) =>
        t
          .setPlaceholder("my-template")
          .setValue(this.plugin.settings.templateFunction)
          .onChange(async (v) => {
            this.plugin.settings.templateFunction = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Template arguments")
      .setDesc(
        "Extra arguments injected into the .with(...) call, for templates that take extra named arguments. Frontmatter (title, subtitle, …) is merged automatically.",
      )
      .addTextArea((t) => {
        t.setPlaceholder('key: "value"')
          .setValue(this.plugin.settings.templateArgs)
          .onChange(async (v) => {
            this.plugin.settings.templateArgs = v;
            await this.plugin.saveSettings();
          });
        t.inputEl.rows = 3;
        t.inputEl.addClass("typst-settings-textarea");
      });

    new Setting(containerEl)
      .setName("Default author")
      .setDesc(
        "Shown in the document header unless the note's frontmatter sets `author:`. Leave empty for no Author line.",
      )
      .addText((t) =>
        t
          .setPlaceholder("Jane Doe")
          .setValue(this.plugin.settings.defaultAuthor)
          .onChange(async (v) => {
            this.plugin.settings.defaultAuthor = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl).setName("Output").setHeading();

    new Setting(containerEl)
      .setName("Output directory")
      .setDesc(
        "Where PDFs are written. Leave empty to write alongside the source file. Relative paths resolve against the vault root.",
      )
      .addText((t) =>
        t
          .setPlaceholder("(alongside source)")
          .setValue(this.plugin.settings.outputDir)
          .onChange(async (v) => {
            this.plugin.settings.outputDir = v.trim()
              ? normalizePath(v.trim())
              : "";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Open PDF after compile")
      .setDesc("Open the resulting PDF in your system viewer after compiling.")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.openAfterCompile)
          .onChange(async (v) => {
            this.plugin.settings.openAfterCompile = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Open .typ files in the Typst editor")
      .setDesc(
        "Show a split source/preview editor for .typ files. Requires an Obsidian restart to take effect.",
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.registerTypView).onChange(async (v) => {
          this.plugin.settings.registerTypView = v;
          await this.plugin.saveSettings();
        }),
      );
  }
}
