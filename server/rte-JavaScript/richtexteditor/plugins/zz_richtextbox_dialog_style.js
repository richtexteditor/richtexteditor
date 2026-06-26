RTE_DefaultConfig.plugin_zz_richtextbox_dialog_style = RTE_Plugin_RichTextBoxDialogStyle;

function RTE_Plugin_RichTextBoxDialogStyle() {
    var obj = this;

    obj.PluginName = "RichTextBoxDialogStyle";

    obj.InitConfig = function (config) {
        if (!config.imageItems) {
            config.imageItems = [];
        }
        if (!config.galleryImages) {
            config.galleryImages = [];
        }
        if (!config.htmlTemplates) {
            config.htmlTemplates = [];
        }
        if (!config.documentItems) {
            config.documentItems = [];
        }
    };

    obj.InitEditor = function () {
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

    function getUrlValue(input) {
        return input && input.value ? input.value.replace(/^\s+|\s+$/g, "") : "";
    }

    function getUrlHost(value) {
        try {
            return new URL(value, window.location.href).hostname || "";
        } catch (ex) {
            return "";
        }
    }

    function getUrlFileName(value) {
        var clean = String(value || "").split("#")[0].split("?")[0];
        var slash = clean.lastIndexOf("/");
        var fileName = slash >= 0 ? clean.substring(slash + 1) : clean;
        try {
            fileName = decodeURIComponent(fileName);
        } catch (ex) {
        }
        return fileName || "";
    }

    function getExtension(value) {
        var fileName = getUrlFileName(value);
        var dot = fileName.lastIndexOf(".");
        if (dot < 0) {
            return "LINK";
        }
        return fileName.substring(dot + 1).toUpperCase().substring(0, 4);
    }

    function ensureUploadIntro(panel, className, message) {
        if (!panel || panel.querySelector("." + className)) {
            return;
        }
        var intro = append(panel, "div", "", className);
        intro.innerText = message;
    }

    function bindInput(input, handler, flagName) {
        if (input[flagName]) {
            return false;
        }

        if (input.addEventListener) {
            input.addEventListener("input", handler);
        } else {
            input.onkeyup = handler;
            input.onchange = handler;
            input.onpaste = handler;
        }

        input[flagName] = true;
        return true;
    }

    function ensureImagePreview(panel, urlLine) {
        if (!panel || !urlLine) {
            return;
        }

        var input = urlLine.querySelector("input[type='text']");
        if (!input) {
            return;
        }

        if (!input.placeholder) {
            input.placeholder = "https://example.com/image.jpg";
        }

        var preview = panel.querySelector(".rte-insertimage-preview");
        if (!preview) {
            preview = append(panel, "div", "", "rte-insertimage-preview is-empty");
            var image = append(preview, "img", "", "rte-insertimage-preview-image");
            image.alt = "Image preview";
            append(preview, "div", "", "rte-insertimage-preview-caption");
        }

        if (input.__rteRichTextBoxImagePreviewBound) {
            return;
        }

        var previewImage = preview.querySelector(".rte-insertimage-preview-image");
        var previewCaption = preview.querySelector(".rte-insertimage-preview-caption");

        function updatePreview() {
            var value = getUrlValue(input);
            if (!value) {
                preview.classList.add("is-empty");
                preview.classList.remove("is-error");
                previewImage.removeAttribute("src");
                previewCaption.innerText = "Enter an image URL to preview it here.";
                return;
            }

            preview.classList.remove("is-empty");
            preview.classList.remove("is-error");
            previewCaption.innerText = "Loading preview...";
            previewImage.src = value;
        }

        previewImage.onload = function () {
            preview.classList.remove("is-empty");
            preview.classList.remove("is-error");
            previewCaption.innerText = "Ready to insert this image.";
        };

        previewImage.onerror = function () {
            preview.classList.remove("is-empty");
            preview.classList.add("is-error");
            previewCaption.innerText = "Preview unavailable for this URL.";
        };

        bindInput(input, updatePreview, "__rteRichTextBoxImagePreviewBound");
        updatePreview();
    }

    function ensureDocumentPreview(panel, urlLine) {
        if (!panel || !urlLine) {
            return;
        }

        var input = urlLine.querySelector("input[type='text']");
        if (!input) {
            return;
        }

        if (!input.placeholder) {
            input.placeholder = "https://example.com/files/proposal.pdf";
        }

        var preview = panel.querySelector(".rte-insertdocument-preview");
        if (!preview) {
            preview = append(panel, "div", "", "rte-insertdocument-preview is-empty");
            var icon = append(preview, "div", "", "rte-insertdocument-preview-icon");
            append(icon, "div", "", "rte-insertdocument-preview-ext");
            var body = append(preview, "div", "", "rte-insertdocument-preview-body");
            append(body, "div", "", "rte-insertdocument-preview-title");
            append(body, "div", "", "rte-insertdocument-preview-meta");
        }

        if (input.__rteRichTextBoxDocumentPreviewBound) {
            return;
        }

        var ext = preview.querySelector(".rte-insertdocument-preview-ext");
        var title = preview.querySelector(".rte-insertdocument-preview-title");
        var meta = preview.querySelector(".rte-insertdocument-preview-meta");

        function updatePreview() {
            var value = getUrlValue(input);
            if (!value) {
                preview.classList.add("is-empty");
                ext.innerText = "DOC";
                title.innerText = "No document selected";
                meta.innerText = "Enter a document URL to preview the inserted link.";
                return;
            }

            preview.classList.remove("is-empty");
            ext.innerText = getExtension(value);
            title.innerText = getUrlFileName(value) || value;

            var host = getUrlHost(value);
            meta.innerText = host
                ? ("Source: " + host + "  |  The editor inserts a clickable link.")
                : "The editor inserts a clickable link at the current cursor position.";
        }

        bindInput(input, updatePreview, "__rteRichTextBoxDocumentPreviewBound");
        updatePreview();
    }

    function enhanceInsertImagePanels(root) {
        var panels = [];
        var i;

        if (root.classList && root.classList.contains("rte-panel-insertimage")) {
            panels.push(root);
        }

        if (root.querySelectorAll) {
            var nested = root.querySelectorAll(".rte-panel-insertimage");
            for (i = 0; i < nested.length; i++) {
                panels.push(nested[i]);
            }
        }

        for (i = 0; i < panels.length; i++) {
            var panel = panels[i];
            panel.classList.add("rte-richtextbox-dialog");

            var uploadTab = panel.querySelector(".fileuploader-dragdrop");
            if (uploadTab) {
                ensureUploadIntro(uploadTab, "rte-insertimage-intro", "Drop an image here or click anywhere in this panel to browse.");
            }

            var urlTab = panel.querySelector(".rte_insertimage_byurl");
            if (urlTab) {
                ensureUploadIntro(urlTab, "rte-insertimage-intro", "Paste a hosted image URL and verify the preview before inserting.");
                ensureImagePreview(urlTab, urlTab.querySelector(".rte-dialog-line-url"));
            }

            var actionButton = panel.querySelector(".rte-dialog-line-action .rte-dialog-button");
            if (actionButton && actionButton.innerText === "Insert") {
                actionButton.innerText = "Insert image";
            }
        }
    }

    function enhanceInsertDocumentPanels(root) {
        var panels = [];
        var i;

        if (root.classList && root.classList.contains("rte-panel-insertdocument")) {
            panels.push(root);
        }

        if (root.querySelectorAll) {
            var nested = root.querySelectorAll(".rte-panel-insertdocument");
            for (i = 0; i < nested.length; i++) {
                panels.push(nested[i]);
            }
        }

        for (i = 0; i < panels.length; i++) {
            var panel = panels[i];
            panel.classList.add("rte-richtextbox-dialog");

            var uploadTab = panel.querySelector(".fileuploader-dragdrop");
            if (uploadTab) {
                ensureUploadIntro(uploadTab, "rte-insertdocument-intro", "Upload a local file or drag it into the dialog to create a document link.");
            }

            var urlTab = panel.querySelector(".rte_insertdocument_byurl");
            if (urlTab) {
                ensureUploadIntro(urlTab, "rte-insertdocument-intro", "Paste a hosted file URL and review the link details before inserting.");
                ensureDocumentPreview(urlTab, urlTab.querySelector(".rte-dialog-line-url"));
            }

            var actionLine = panel.querySelector(".rte-dialog-line-action");
            if (actionLine) {
                actionLine.classList.add("rte-insertdocument-actions");
            }

            var actionButton = panel.querySelector(".rte-dialog-line-action .rte-dialog-button");
            if (actionButton && actionButton.innerText === "Insert") {
                actionButton.innerText = "Insert document";
            }
            if (actionButton && actionButton.innerText === "Update") {
                actionButton.innerText = "Update document";
            }
        }
    }

    function patchTree(root) {
        if (!root || root.nodeType !== 1) {
            return;
        }

        enhanceInsertImagePanels(root);
        enhanceInsertDocumentPanels(root);
    }

    function start() {
        patchTree(document.documentElement);

        if (!window.MutationObserver) {
            return;
        }

        var observer = new MutationObserver(function (mutations) {
            var i;
            var j;
            for (i = 0; i < mutations.length; i++) {
                for (j = 0; j < mutations[i].addedNodes.length; j++) {
                    patchTree(mutations[i].addedNodes[j]);
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", start);
        } else {
            window.attachEvent("onload", start);
        }
    } else {
        start();
    }
}
