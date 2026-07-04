# RichTextEditor

**The complete WYSIWYG editor for the web — AI toolkit, real-time collaboration, and a perpetual license in the box.**

RichTextEditor is a full-featured JavaScript rich text editor with a built-in AI Toolkit (Ask AI, AI Chat, AI Review, bring-your-own-key), per-node Yjs CRDT real-time collaboration, track changes, threaded comments, revision history, JSON + Markdown structured content, and native bindings for React, Vue, Angular, Svelte, Blazor, ASP.NET Core, ASP.NET Web Forms, and PHP.

**One domain, one purchase — from $129, perpetual.** No per-load metering, no subscription, no AI add-on fees. A free community version is available.

[Live demos](https://richtexteditor.com/demos/) · [Documentation](https://richtexteditor.com/docs/) · [Pricing](https://richtexteditor.com/pricing/) · [Compare vs TinyMCE / CKEditor / Froala / Tiptap](https://richtexteditor.com/compare/)

---

## Quick start

### npm

```bash
npm install @richscripts/richtexteditor

# or scaffold a complete working example app:
npm create @richscripts/richtexteditor my-app -- --react   # also: --vue, --angular
```

```js
// Side-effect import attaches `RichTextEditor` to `window`.
import "@richscripts/richtexteditor/richtexteditor/rte.js";
import "@richscripts/richtexteditor/richtexteditor/plugins/all_plugins.js";

const editor = new RichTextEditor("#myeditor");

// Or the typed React wrapper (Vue / Angular / Svelte wrappers shipped too):
import { RichTextEditorComponent } from "@richscripts/richtexteditor/react";
```

### .NET

```bash
dotnet new install RichTextEditor.Templates

dotnet new richtexteditor-mvc    -n MyApp   # ASP.NET Core MVC
dotnet new richtexteditor-razor  -n MyApp   # Razor Pages
dotnet new richtexteditor-blazor -n MyApp   # Blazor Server
```

### Script tag

```html
<link rel="stylesheet" href="/richtexteditor/rte_theme_default.css" />
<script src="/richtexteditor/rte.js"></script>
<script src="/richtexteditor/plugins/all_plugins.js"></script>

<div id="myeditor"></div>
<script>var editor = new RichTextEditor("#myeditor");</script>
```

The `richtexteditor/` folder in this repository is the current distributable runtime — copy it into your static assets and you're running.

## What's in this repository

| Folder | Contents |
| --- | --- |
| [`richtexteditor/`](richtexteditor/) | The editor runtime: `rte.js`, 50+ plugins, themes, 30+ language packs |
| [`html/`](html/) | Plain-HTML demo pages you can open directly |
| [`server/`](server/) | Server integration examples: ASP.NET Core (MVC / Razor / Blazor), ASP.NET Framework (MVC / Web Forms), PHP, plus React, Vue, Angular, and TypeScript client apps — each with upload handlers and AI endpoints wired |

## Highlights

- **AI Toolkit** — Ask AI, docked AI Chat, reviewable AI suggestions, streaming, [BYOK per-tenant key vault](https://richtexteditor.com/byok/). Works with OpenAI-compatible endpoints, Azure OpenAI, Anthropic, Gemini, or local Ollama.
- **Real-time collaboration** — per-node Yjs CRDT text sync, presence cursors, per-author undo. [Architecture docs](https://richtexteditor.com/docs/crdt-internals/)
- **Review workflow** — track changes, threaded comments, named revision history.
- **Structured content** — lossless JSON document model and Markdown round-trip.
- **Everything editors are judged by** — clean paste from Word/Excel, tables, image editing and uploads, mentions, slash commands, find & replace, accessibility checker, dark mode, mobile toolbar, 30+ languages.

## License

The editor is commercial software: [license agreement](https://richtexteditor.com/license/) · [pricing](https://richtexteditor.com/pricing/) — perpetual per-domain licensing with a free community version. The runtime in this repository is the protected distribution build; it runs in trial mode until a license key is configured.

## Support & feedback

- **Bug reports / feature requests:** [open an issue](https://github.com/richtexteditor/richtexteditor/issues)
- **Docs:** https://richtexteditor.com/docs/
- **Pre-sales / support:** https://richtexteditor.com/support/
