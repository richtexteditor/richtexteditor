RTE_DefaultConfig.plugin_inserttemplate = RTE_Plugin_InsertTemplate;

function RTE_Plugin_InsertTemplate() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "InsertTemplate";

    // 2026-10-18 the words read config.text_ keys (language packs), English as the fallback; {0} fills a template.
    // tools/i18n/plugin-panels-language.mjs
    function pText(key, fallback, arg) {
        var s = (config && config["text_" + key]) || fallback;
        return arg === undefined ? s : s.split("{0}").join(String(arg));
    }
    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (!config.htmlTemplates) {
            config.htmlTemplates = [];
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_inserttemplate", function (state) {
            state.returnValue = true;
            obj.DoInsertTemplate();
        });
    };

    function append(parent, tagName, cssText, className) {
        var tag = parent.ownerDocument.createElement(tagName);
        if (cssText) {
            tag.style.cssText = cssText;
        }
        if (className) {
            tag.className = className;
        }
        parent.appendChild(tag);
        return tag;
    }

    function clear(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function stripHtml(html) {
        var div = document.createElement("div");
        div.innerHTML = html || "";
        return div.innerText || div.textContent || "";
    }

    function normalizeTemplateItem(item, index) {
        if (item instanceof Array) {
            return {
                id: "template-" + index,
                title: item[0] || pText("tp_template", "Template {0}", index + 1),
                html: item[1] || "",
                meta: item[2] || ""
            };
        }

        if (item && typeof item === "object") {
            return {
                id: item.id || ("template-" + index),
                title: item.title || item.name || item.text || pText("tp_template", "Template {0}", index + 1),
                html: item.html || item.content || "",
                meta: item.meta || item.description || ""
            };
        }

        if (typeof item === "string") {
            return {
                id: "template-" + index,
                title: pText("tp_template", "Template {0}", index + 1),
                html: item,
                meta: ""
            };
        }

        return null;
    }

    function scalePreview(body, canvas) {
        var maxWidth = 206;
        var maxHeight = 166;
        var width = Math.max(canvas.scrollWidth, 1);
        var height = Math.max(canvas.scrollHeight, 1);
        var scale = Math.min(1, maxWidth / width, maxHeight / height);

        canvas.style.transformOrigin = "top left";
        canvas.style.transform = "scale(" + scale + ")";
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
    }

    obj.DoInsertTemplate = function () {
        var dialoginner = editor.createDialog(editor.getLangText("inserttemplatetitle") || "Insert template", "rte-dialog-inserttemplate");
        var closeDialog = typeof dialoginner.close === "function" ? function () {
            dialoginner.close();
        } : function () {
            editor.closeCurrentPopup();
        };

        var browser = append(dialoginner, "div", "", "rte-dialog-browser");
        // The outer dialog frame supplies the title bar — only render a subtitle here.
        var header = append(browser, "div", "", "rte-dialog-browser-header");
        var copy = append(header, "div", "", "rte-dialog-browser-copy");
        copy.innerText = pText("tp_copy", "Preview reusable layouts, search by name, and replace the current editor content with a selected template.");

        var toolbar = append(browser, "div", "", "rte-dialog-browser-toolbar");
        var search = append(toolbar, "input", "", "rte-dialog-browser-search");
        search.type = "search";
        search.placeholder = pText("tp_search", "Search templates");
        search.setAttribute("aria-label", pText("tp_search", "Search templates"));
        var count = append(toolbar, "div", "", "rte-dialog-browser-count");
        count.setAttribute("role", "status");
        count.setAttribute("aria-live", "polite");

        var scrollpanel = append(browser, "div", "", "rte-dialog-browser-scrollpanel");
        var grid = append(scrollpanel, "div", "", "rte-dialog-browser-grid rte-template-grid");
        grid.setAttribute("role", "listbox");
        grid.setAttribute("aria-label", pText("tp_available", "Available templates"));
        var empty = append(scrollpanel, "div", "", "rte-dialog-browser-empty");
        empty.innerText = pText("tp_nomatch", "No templates match the current filter.");

        var footer = append(browser, "div", "", "rte-gallery-browser-footer");
        var footerText = append(footer, "div", "", "rte-gallery-browser-footer-text");
        footerText.innerText = pText("tp_select", "Select a template to replace the current content.");

        var cancelButton = append(footer, "button", "", "rte-gallery-browser-button");
        cancelButton.type = "button";
        cancelButton.innerText = pText("cancel", "Cancel");

        var applyButton = append(footer, "button", "", "rte-gallery-browser-button rte-gallery-browser-button-primary");
        applyButton.type = "button";
        applyButton.innerText = pText("tp_replace", "Replace Content");
        applyButton.disabled = true;

        var selectedId = "";

        function getTemplates() {
            var list = [];
            var items = config.htmlTemplates || [];
            var i;
            for (i = 0; i < items.length; i++) {
                var normalized = normalizeTemplateItem(items[i], i);
                if (normalized && normalized.html) {
                    list.push(normalized);
                }
            }
            return list;
        }

        function getFilteredTemplates() {
            var keyword = search.value.replace(/^\s+|\s+$/g, "").toLowerCase();
            var items = getTemplates();
            if (!keyword) {
                return items;
            }

            return items.filter(function (item) {
                var plainText = stripHtml(item.html).toLowerCase();
                return item.title.toLowerCase().indexOf(keyword) >= 0
                    || plainText.indexOf(keyword) >= 0
                    || (item.meta && item.meta.toLowerCase().indexOf(keyword) >= 0);
            });
        }

        function updateFooter(items) {
            var selectedTemplate = null;
            var i;
            for (i = 0; i < items.length; i++) {
                if (items[i].id === selectedId) {
                    selectedTemplate = items[i];
                    break;
                }
            }

            count.innerText = items.length === 1 ? pText("tp_count1", "1 template") : pText("tp_countn", "{0} templates", items.length);
            footerText.innerText = selectedTemplate
                ? pText("tp_ready", "Ready to replace the editor content with {0}.", selectedTemplate.title)
                : pText("tp_select", "Select a template to replace the current content.");
            applyButton.disabled = !selectedTemplate;
        }

        function applySelected() {
            var items = getTemplates();
            var i;
            for (i = 0; i < items.length; i++) {
                if (items[i].id === selectedId) {
                    // 2026-10-03 undoable: Ctrl+Z gives back exactly the document this replaced, edits made just
                    // before included (tools/import/replace-undo-plugins.mjs)
                    editor.setHTMLCode(items[i].html, { undoable: true });
                    closeDialog();
                    editor.focus();
                    return;
                }
            }
        }

        function render() {
            clear(grid);
            var items = getFilteredTemplates();
            var i;

            empty.style.display = items.length ? "none" : "block";

            for (i = 0; i < items.length; i++) {
                (function (item) {
                    var card = append(grid, "button", "", "rte-dialog-browser-card");
                    card.type = "button";
                    card.setAttribute("role", "option");
                    card.setAttribute("aria-selected", item.id === selectedId ? "true" : "false");
                    if (item.id === selectedId) {
                        card.classList.add("is-selected");
                    }

                    var preview = append(card, "div", "", "rte-template-card-preview");
                    var previewBody = append(preview, "div", "", "rte-template-card-preview-body");
                    var canvas = append(previewBody, "div", "", "rte-template-card-preview-canvas");
                    canvas.innerHTML = item.html;
                    scalePreview(previewBody, canvas);

                    var footer = append(card, "div", "", "rte-template-card-footer");
                    var title = append(footer, "div", "", "rte-template-card-title");
                    title.innerText = item.title;
                    var meta = append(footer, "div", "", "rte-template-card-meta");
                    meta.innerText = item.meta || stripHtml(item.html).substring(0, 80) || pText("tp_reusable", "Reusable template");

                    // 2026-10-03 Select IN PLACE: re-rendering every card here meant the second click of a
                    // double-click hit a new element, so Firefox fired no dblclick and nothing was applied.
                    // tools/templates/template-dblclick.mjs
                    card.onclick = function () {
                        selectedId = item.id;
                        var cards = grid.querySelectorAll(".rte-dialog-browser-card");
                        for (var c = 0; c < cards.length; c++) {
                            cards[c].classList.toggle("is-selected", cards[c] === card);
                            cards[c].setAttribute("aria-selected", cards[c] === card ? "true" : "false");
                        }
                        updateFooter(getFilteredTemplates());
                    };

                    card.ondblclick = function () {
                        selectedId = item.id;
                        applySelected();
                    };
                })(items[i]);
            }

            if (selectedId) {
                var visible = false;
                for (i = 0; i < items.length; i++) {
                    if (items[i].id === selectedId) {
                        visible = true;
                        break;
                    }
                }
                if (!visible) {
                    selectedId = "";
                }
            }

            updateFooter(items);
        }

        search.oninput = render;
        cancelButton.onclick = closeDialog;
        applyButton.onclick = applySelected;

        render();
        search.focus();
    };
}
