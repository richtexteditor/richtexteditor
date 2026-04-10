RTE_DefaultConfig.plugin_insertgallery = RTE_Plugin_InsertGallery;

function RTE_Plugin_InsertGallery() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "InsertGallery";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (!config.galleryImages) {
            config.galleryImages = [];
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_insertgallery", function (state) {
            state.returnValue = true;
            obj.DoInsertGallery();
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

    function getFileName(url) {
        var value = String(url || "").split("#")[0].split("?")[0];
        var lastSlash = value.lastIndexOf("/");
        var name = lastSlash >= 0 ? value.substring(lastSlash + 1) : value;
        try {
            name = decodeURIComponent(name);
        } catch (ex) {
        }
        return name || "Image";
    }

    function getMetaText(item) {
        if (item.meta) {
            return item.meta;
        }
        if (item.alt) {
            return item.alt;
        }
        return item.url;
    }

    function normalizeGalleryItem(item) {
        var normalized = null;

        if (typeof item === "string") {
            normalized = {
                url: item,
                thumbnail: item,
                name: getFileName(item)
            };
        } else if (item instanceof Array) {
            normalized = {
                url: item[0],
                thumbnail: item[0],
                name: item[1] || getFileName(item[0]),
                meta: item[2] || ""
            };
        } else if (item && typeof item === "object") {
            var url = item.url || item.src || item.href;
            if (!url) {
                return null;
            }

            normalized = {
                url: url,
                thumbnail: item.thumbnail || item.thumb || item.preview || url,
                name: item.name || item.text || item.title || getFileName(url),
                meta: item.meta || item.description || item.alt || ""
            };
        }

        if (!normalized || !normalized.url) {
            return null;
        }

        if (!normalized.thumbnail) {
            normalized.thumbnail = normalized.url;
        }

        if (!normalized.name) {
            normalized.name = getFileName(normalized.url);
        }

        return normalized;
    }

    function uploadFiles(fileList, onUploaded, onFinished, onFailed) {
        var files = [];
        var handler = window.rte_file_upload_handler;
        var i;

        for (i = 0; i < fileList.length; i++) {
            files.push(fileList[i]);
        }

        if (!files.length) {
            onFinished();
            return;
        }

        if (typeof handler !== "function") {
            if (onFailed) {
                onFailed("Upload handler is not configured.");
            }
            onFinished();
            return;
        }

        var index = 0;

        function next() {
            if (index >= files.length) {
                onFinished();
                return;
            }

            var file = files[index];
            handler(file, function (url, error) {
                if (url) {
                    onUploaded(url, file, index, files);
                } else if (onFailed) {
                    onFailed(error || ("Upload failed for " + file.name), file);
                }

                index++;
                next();
            }, index, files);
        }

        next();
    }

    obj.DoInsertGallery = function () {
        var dialoginner = editor.createDialog(editor.getLangText("insertgallerytitle") || "Image gallery", "rte-dialog-insertgallery");
        var closeDialog = typeof dialoginner.close === "function" ? function () {
            dialoginner.close();
        } : function () {
            editor.closeCurrentPopup();
        };

        var browser = append(dialoginner, "div", "", "rte-gallery-browser");
        var header = append(browser, "div", "", "rte-dialog-browser-header");
        var kicker = append(header, "div", "", "rte-dialog-browser-kicker");
        kicker.innerText = "Media Library";
        var title = append(header, "div", "", "rte-dialog-browser-title");
        title.innerText = "Image gallery";
        var copy = append(header, "div", "", "rte-dialog-browser-copy");
        copy.innerText = "Browse uploaded assets, filter by name, and insert the selected image into the editor.";

        var toolbar = append(browser, "div", "", "rte-gallery-browser-toolbar");
        var path = append(toolbar, "div", "", "rte-gallery-browser-path");
        path.innerText = "/";
        var type = append(toolbar, "div", "", "rte-gallery-browser-type");
        type.innerText = "Image Files";

        var uploadButton = append(toolbar, "button", "", "rte-gallery-browser-button");
        uploadButton.type = "button";
        uploadButton.innerText = "Upload";

        var refreshButton = append(toolbar, "button", "", "rte-gallery-browser-button");
        refreshButton.type = "button";
        refreshButton.innerText = "Refresh";

        var search = append(toolbar, "input", "", "rte-gallery-browser-search");
        search.type = "search";
        search.placeholder = "Search images";

        var fileInput = append(toolbar, "input", "display:none;");
        fileInput.type = "file";
        fileInput.accept = "image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg";
        fileInput.multiple = true;

        var status = append(browser, "div", "", "rte-gallery-browser-status");
        var surface = append(browser, "div", "", "rte-gallery-browser-surface");
        var grid = append(surface, "div", "", "rte-gallery-browser-grid");
        var empty = append(surface, "div", "", "rte-gallery-browser-empty");
        empty.innerText = "No images match this search. Upload a file or adjust the filter.";

        var footer = append(browser, "div", "", "rte-gallery-browser-footer");
        var footerText = append(footer, "div", "", "rte-gallery-browser-footer-text");
        footerText.innerText = "Choose an image to enable insert.";

        var cancelButton = append(footer, "button", "", "rte-gallery-browser-button");
        cancelButton.type = "button";
        cancelButton.innerText = "Cancel";

        var insertButton = append(footer, "button", "", "rte-gallery-browser-button rte-gallery-browser-button-primary");
        insertButton.type = "button";
        insertButton.innerText = "Insert";
        insertButton.disabled = true;

        var selectedUrl = "";

        function getNormalizedItems() {
            var list = [];
            var items = config.galleryImages || [];
            var i;
            for (i = 0; i < items.length; i++) {
                var normalized = normalizeGalleryItem(items[i]);
                if (normalized) {
                    list.push(normalized);
                }
            }
            return list;
        }

        function getFilteredItems() {
            var keyword = search.value.replace(/^\s+|\s+$/g, "").toLowerCase();
            var items = getNormalizedItems();
            if (!keyword) {
                return items;
            }

            return items.filter(function (item) {
                return (item.name && item.name.toLowerCase().indexOf(keyword) >= 0)
                    || (item.meta && item.meta.toLowerCase().indexOf(keyword) >= 0)
                    || (item.url && item.url.toLowerCase().indexOf(keyword) >= 0);
            });
        }

        function updateStatus(items) {
            var selectedName = "";
            var i;
            for (i = 0; i < items.length; i++) {
                if (items[i].url === selectedUrl) {
                    selectedName = items[i].name;
                    break;
                }
            }

            status.innerText = items.length + " item" + (items.length === 1 ? "" : "s") + " available."
                + (selectedName ? " " + selectedName + " selected." : " No image selected.");
            footerText.innerText = selectedName ? ("Ready to insert " + selectedName + ".") : "Choose an image to enable insert.";
            insertButton.disabled = !selectedName;
        }

        function insertSelected() {
            if (!selectedUrl) {
                return;
            }
            editor.insertImageByUrl(selectedUrl);
            closeDialog();
            editor.focus();
        }

        function render() {
            clear(grid);
            var items = getFilteredItems();
            var i;

            empty.style.display = items.length ? "none" : "block";

            for (i = 0; i < items.length; i++) {
                (function (item) {
                    var card = append(grid, "button", "", "rte-gallery-browser-card");
                    card.type = "button";
                    if (item.url === selectedUrl) {
                        card.classList.add("is-selected");
                    }

                    var selection = append(card, "div", "", "rte-gallery-browser-selection");
                    selection.innerText = item.url === selectedUrl ? "Selected" : "";

                    var thumb = append(card, "div", "", "rte-gallery-browser-thumbnail");
                    var image = append(thumb, "img", "", "rte-gallery-browser-thumbnail-image");
                    image.src = item.thumbnail;
                    image.alt = item.name;

                    var name = append(card, "div", "", "rte-gallery-browser-name");
                    name.innerText = item.name;

                    var meta = append(card, "div", "", "rte-gallery-browser-meta");
                    meta.innerText = getMetaText(item);

                    card.onclick = function () {
                        selectedUrl = item.url;
                        render();
                    };

                    card.ondblclick = function () {
                        selectedUrl = item.url;
                        insertSelected();
                    };
                })(items[i]);
            }

            if (selectedUrl) {
                var stillVisible = false;
                for (i = 0; i < items.length; i++) {
                    if (items[i].url === selectedUrl) {
                        stillVisible = true;
                        break;
                    }
                }
                if (!stillVisible) {
                    selectedUrl = "";
                }
            }

            updateStatus(items);
        }

        uploadButton.onclick = function () {
            fileInput.click();
        };

        fileInput.onchange = function () {
            var lastUploaded = "";
            status.innerText = "Uploading images...";

            uploadFiles(fileInput.files, function (url) {
                lastUploaded = url;
                config.galleryImages.unshift(url);
            }, function () {
                if (lastUploaded) {
                    selectedUrl = lastUploaded;
                }
                fileInput.value = "";
                render();
            }, function (error) {
                status.innerText = error || "Upload failed.";
            });
        };

        refreshButton.onclick = render;
        search.oninput = render;
        cancelButton.onclick = closeDialog;
        insertButton.onclick = insertSelected;

        render();
        search.focus();
    };
}
