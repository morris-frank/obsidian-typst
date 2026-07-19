import { App, PluginSettingTab, Setting, normalizePath } from "obsidian";
import type TypstPlugin from "./main";

export interface TypstPluginSettings {
  /** Absolute path to the `typst` binary (or just "typst" if on PATH). */
  typstPath: string;
  /** Absolute path to the `pandoc` binary (or just "pandoc" if on PATH). */
  pandocPath: string;
  /**
   * Path to the Typst template. May be a `.typ` file or a directory that
   * contains a single `.typ` template (e.g. the soilytix-document skill dir).
   * Used only for the Markdown -> Typst -> PDF pipeline; direct `.typ` files
   * are compiled as-is.
   */
  templatePath: string;
  /** Name of the template show-rule function to apply, e.g. `soilytix-document`. */
  templateFunction: string;
  /**
   * Extra arguments injected verbatim into `#show: <fn>.with( ... )`, e.g.
   * `accent: "mint", pattern: "milbe"`. Frontmatter-derived args are merged
   * before these, so these win on conflict.
   */
  templateArgs: string;
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
  templatePath:
    "/Users/mfr/code/soilytix/claude-plugin/skills/soilytix-document",
  templateFunction: "soilytix-document",
  templateArgs: 'accent: "mint"',
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

    containerEl.createEl("h2", { text: "Binaries" });

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

    containerEl.createEl("h2", { text: "Template" });

    new Setting(containerEl)
      .setName("Template path")
      .setDesc(
        "A .typ template file, or a directory containing one. Used when exporting Markdown notes to PDF.",
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
        "The show-rule function applied via `#show: <fn>.with(...)`. For the Soilytix template this is `soilytix-document`.",
      )
      .addText((t) =>
        t
          .setPlaceholder("soilytix-document")
          .setValue(this.plugin.settings.templateFunction)
          .onChange(async (v) => {
            this.plugin.settings.templateFunction = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Template arguments")
      .setDesc(
        'Extra arguments injected into the .with(...) call, e.g. `accent: "mint", pattern: "milbe"`. Frontmatter (title, subtitle, …) is merged automatically.',
      )
      .addTextArea((t) => {
        t.setPlaceholder('accent: "mint"')
          .setValue(this.plugin.settings.templateArgs)
          .onChange(async (v) => {
            this.plugin.settings.templateArgs = v;
            await this.plugin.saveSettings();
          });
        t.inputEl.rows = 3;
        t.inputEl.style.width = "100%";
      });

    containerEl.createEl("h2", { text: "Output" });

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
