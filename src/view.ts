import { TextFileView, WorkspaceLeaf, Notice, TFile } from "obsidian";
import type TypstPlugin from "./main";
import { compileTypToBuffer, CompileError } from "./compiler";

export const VIEW_TYPE_TYPST = "typst-source-view";

/**
 * A split editor for `.typ` files: an editable monospace source pane on the
 * left and a compiled-PDF preview on the right. Compilation shells out to the
 * `typst` binary and renders the PDF in an iframe.
 */
export class TypstView extends TextFileView {
  plugin: TypstPlugin;
  private sourceEl!: HTMLTextAreaElement;
  private previewFrame!: HTMLIFrameElement;
  private statusEl!: HTMLElement;
  private previewUrl: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: TypstPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_TYPST;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "Typst";
  }

  getIcon(): string {
    return "file-code";
  }

  getViewData(): string {
    return this.sourceEl?.value ?? this.data;
  }

  setViewData(data: string, _clear: boolean): void {
    this.data = data;
    if (this.sourceEl) this.sourceEl.value = data;
  }

  clear(): void {
    this.data = "";
    if (this.sourceEl) this.sourceEl.value = "";
    this.revokePreview();
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass("typst-view");

    const toolbar = root.createDiv({ cls: "typst-toolbar" });
    const compileBtn = toolbar.createEl("button", {
      text: "Compile",
      cls: "mod-cta",
    });
    compileBtn.addEventListener("click", () => void this.compile());

    const exportBtn = toolbar.createEl("button", { text: "Save PDF" });
    exportBtn.addEventListener("click", () => void this.exportPdf());

    this.statusEl = toolbar.createSpan({ cls: "typst-status" });

    const split = root.createDiv({ cls: "typst-split" });
    this.sourceEl = split.createEl("textarea", { cls: "typst-source" });
    this.sourceEl.spellcheck = false;
    this.sourceEl.value = this.data;
    // TextFileView auto-saves when requestSave fires.
    this.sourceEl.addEventListener("input", () => {
      this.data = this.sourceEl.value;
      this.requestSave();
    });
    // Cmd/Ctrl+S triggers a compile as well as the implicit save.
    this.sourceEl.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void this.compile();
      }
    });

    const previewWrap = split.createDiv({ cls: "typst-preview" });
    this.previewFrame = previewWrap.createEl("iframe", {
      cls: "typst-preview-frame",
    });
  }

  async onClose(): Promise<void> {
    this.revokePreview();
  }

  private setStatus(text: string, kind: "ok" | "error" | "busy" = "ok"): void {
    this.statusEl.setText(text);
    this.statusEl.removeClass("is-ok", "is-error", "is-busy");
    this.statusEl.addClass(
      kind === "ok" ? "is-ok" : kind === "error" ? "is-error" : "is-busy",
    );
  }

  private revokePreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  private async currentPath(): Promise<string | null> {
    if (!this.file) return null;
    // @ts-expect-error getBasePath exists on the desktop FileSystemAdapter.
    const base: string = this.app.vault.adapter.getBasePath();
    return `${base}/${this.file.path}`;
  }

  async compile(): Promise<void> {
    if (!this.file) return;
    // Persist edits before compiling from disk.
    await this.save();
    this.setStatus("Compiling…", "busy");
    try {
      const abs = await this.currentPath();
      if (!abs) throw new CompileError("Could not resolve file path.");
      const buffer = await compileTypToBuffer(abs, this.plugin.settings);
      this.revokePreview();
      const blob = new Blob([buffer], { type: "application/pdf" });
      this.previewUrl = URL.createObjectURL(blob);
      this.previewFrame.src = this.previewUrl;
      this.setStatus("Compiled", "ok");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus("Error", "error");
      new Notice(`Typst: ${msg}`, 8000);
    }
  }

  private async exportPdf(): Promise<void> {
    if (!(this.file instanceof TFile)) return;
    await this.save();
    this.setStatus("Exporting…", "busy");
    try {
      await this.plugin.exportFileToPdf(this.file);
      this.setStatus("Saved", "ok");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus("Error", "error");
      new Notice(`Typst: ${msg}`, 8000);
    }
  }
}
