// 2026-08-05 Image gallery browser.
//
// Two implementations of this dialog had drifted apart: the flagship shipped a
// flat grid built from config.galleryImages, while the RichTextBox package
// shipped a server-backed file manager (folders, breadcrumb, New folder, upload
// into the current folder). The tier audit requires one identical plugin
// everywhere, so keeping both meant one of them silently overwriting the other
// on the next sync — which is exactly what happened: the folder browser's CSS
// was dropped and its folder tiles rendered as blank boxes on the live site.
//
// This is the merged implementation. It is server-backed when an endpoint is
// configured and falls back to the packaged preset list otherwise, so a host
// with no gallery endpoint behaves exactly as the flat grid always did.
//
//   config.galleryEndpoint   URL returning { currentFolder, currentFolderDisplay,
//                            parentFolder, folders: [{folder,name}],
//                            images: [{url,name,folder,size,source}] }.
//                            Absent -> local mode: presets only, no request.
//   config.galleryImages     Preset images. String, [url, text], or an object
//                            with url/src/href plus optional thumbnail/name/meta.
//
// Uploads use window.richTextBoxUploadFile when present (it accepts a target
// folder), otherwise the generic window.rte_file_upload_handler.

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

    function getGalleryEndpoint() {
        return config.galleryEndpoint || window.RichTextBoxGalleryUrl || "";
    }

    function withFolder(url, folder) {
        var separator = url.indexOf("?") >= 0 ? "&" : "?";
        return url + separator + "folder=" + encodeURIComponent(folder || "");
    }

    function requestJson(method, url, body, callback) {
        var request = new XMLHttpRequest();
        request.open(method, url, true);

        request.onreadystatechange = function () {
            if (request.readyState !== 4) {
                return;
            }

            if (request.status < 200 || request.status >= 300) {
                callback(null, "http-" + request.status);
                return;
            }

            try {
                callback(JSON.parse(request.responseText), null);
            } catch (ex) {
                callback(null, "invalid-json");
            }
        };

        request.onerror = function () {
            callback(null, "network-error");
        };

        if (body) {
            request.send(body);
            return;
        }

        request.send();
    }

    // Query strings and percent-escapes both show up in real upload URLs, so
    // strip and decode rather than splitting on "/" alone.
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

    function humanSize(size) {
        if (!size) {
            return "";
        }
        if (size < 1024) {
            return size + " B";
        }
        if (size < 1024 * 1024) {
            return Math.round(size / 1024) + " KB";
        }
        return (Math.round(size * 10 / (1024 * 1024)) / 10) + " MB";
    }

    function normalizePreset(item) {
        var normalized = null;

        if (typeof item === "string") {
            normalized = { url: item, thumbnail: item, name: getFileName(item) };
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

        normalized.thumbnail = normalized.thumbnail || normalized.url;
        normalized.name = normalized.name || getFileName(normalized.url);
        normalized.source = "preset";
        normalized.folder = "";
        normalized.searchText = (normalized.name + " " + (normalized.meta || "") + " " + normalized.url).toLowerCase();
        return normalized;
    }

    function normalizeServerFolder(item) {
        if (!item || !item.folder) {
            return null;
        }
        var name = item.name || getFileName(item.folder) || item.folder;
        return {
            name: name,
            folder: item.folder,
            searchText: (name + " " + item.folder).toLowerCase()
        };
    }

    function normalizeServerImage(item) {
        if (!item || !item.url) {
            return null;
        }
        var name = item.name || getFileName(item.url);
        return {
            name: name,
            url: item.url,
            thumbnail: item.thumbnail || item.url,
            folder: item.folder || "",
            source: item.source || "upload",
            size: item.size || 0,
            searchText: (name + " " + item.url).toLowerCase()
        };
    }

    function setDisabled(button, disabled) {
        button.disabled = !!disabled;
        if (disabled) {
            button.setAttribute("aria-disabled", "true");
        } else {
            button.removeAttribute("aria-disabled");
        }
    }

    function show(element, visible) {
        element.style.display = visible ? "" : "none";
    }

    obj.DoInsertGallery = function () {
        var endpoint = getGalleryEndpoint();
        var serverMode = !!endpoint;
        var uploadToFolder = typeof window.richTextBoxUploadFile === "function";
        var genericUpload = typeof window.rte_file_upload_handler === "function";
        var canUpload = uploadToFolder || genericUpload;

        var presetImages = [];
        var presetSource = config.galleryImages || [];
        var i;
        for (i = 0; i < presetSource.length; i++) {
            var preset = normalizePreset(presetSource[i]);
            if (preset) {
                presetImages.push(preset);
            }
        }

        var dialoginner = editor.createDialog(editor.getLangText("insertgallerytitle") || "Image gallery", "rte-dialog-insertgallery");
        var closeDialog = typeof dialoginner.close === "function" ? function () {
            dialoginner.close();
        } : function () {
            editor.closeCurrentPopup();
        };

        var browser = append(dialoginner, "div", "", "rte-gallery-browser");

        // Exactly what the upload endpoint accepts, and nothing more. The file
        // picker used to advertise "image/*,...,.svg", so it offered files the
        // server then rejected with "Invalid file extension" and the user had no
        // way to know the real list until after the failure. Declared here
        // because both the header hint and the file input read it.
        // SVG is excluded on purpose: it can carry script, so it is not a safe
        // thing to store and serve back from our own origin.
        var GALLERY_ACCEPT = [".jpg", ".jpeg", ".jfif", ".png", ".gif", ".webp", ".bmp", ".avif"];

        // The dialog frame already draws a title bar and close button, so this is
        // a one-line subtitle, not a second heading.
        var header = append(browser, "div", "", "rte-dialog-browser-header");
        var copy = append(header, "div", "", "rte-dialog-browser-copy");
        copy.innerText = serverMode
            ? "Browse folders, upload new files, and insert the selected image into the editor."
            : "Browse the available images, filter by name, and insert the selected image into the editor.";

        // State the accepted formats up front. Previously the only way to learn
        // them was to pick an unsupported file and read "Invalid file extension".
        var acceptHint = append(header, "div", "", "rte-dialog-browser-accept");
        acceptHint.innerText = "Accepted formats: " +
            GALLERY_ACCEPT.map(function (ext) { return ext.replace(".", "").toUpperCase(); }).join(", ");

        var toolbar = append(browser, "div", "", "rte-gallery-browser-toolbar");
        var toolbarLeft = append(toolbar, "div", "", "rte-gallery-browser-toolbar-group");
        var toolbarRight = append(toolbar, "div", "", "rte-gallery-browser-toolbar-group rte-gallery-browser-toolbar-group-right");

        var upButton = append(toolbarLeft, "button", "", "rte-gallery-browser-button");
        upButton.type = "button";
        upButton.innerText = "Up";
        upButton.setAttribute("aria-label", "Go to the parent folder");

        var path = append(toolbarLeft, "div", "", "rte-gallery-browser-path");
        path.innerText = "/";

        var type = append(toolbarLeft, "div", "", "rte-gallery-browser-type");
        type.innerText = "Image files";

        var createFolderButton = append(toolbarLeft, "button", "", "rte-gallery-browser-button");
        createFolderButton.type = "button";
        createFolderButton.innerText = "New folder";

        var uploadButton = append(toolbarLeft, "button", "", "rte-gallery-browser-button rte-gallery-browser-button-primary");
        uploadButton.type = "button";
        uploadButton.innerText = "Upload";

        var refreshButton = append(toolbarLeft, "button", "", "rte-gallery-browser-button");
        refreshButton.type = "button";
        refreshButton.innerText = "Refresh";

        var search = append(toolbarRight, "input", "", "rte-gallery-browser-search");
        search.type = "search";
        search.placeholder = "Search images";
        search.setAttribute("aria-label", "Search images");

        var fileInput = append(toolbarRight, "input", "display:none;");
        fileInput.type = "file";
        fileInput.accept = GALLERY_ACCEPT.join(",");
        fileInput.multiple = true;

        // Without a server there is no folder tree to walk and nothing to create
        // a folder in, so those controls are hidden rather than shown disabled.
        show(upButton, serverMode);
        show(path, serverMode);
        show(createFolderButton, serverMode);
        show(uploadButton, canUpload);

        var status = append(browser, "div", "", "rte-gallery-browser-status");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");

        var surface = append(browser, "div", "", "rte-gallery-browser-surface");

        // Folders are navigation and images are choices, so they cannot share one
        // listbox — a non-option child of a listbox is invalid ARIA.
        var folderGrid = append(surface, "div", "", "rte-gallery-browser-grid rte-gallery-browser-grid-folders");
        folderGrid.setAttribute("role", "group");
        folderGrid.setAttribute("aria-label", "Folders");

        var grid = append(surface, "div", "", "rte-gallery-browser-grid");
        grid.setAttribute("role", "listbox");
        grid.setAttribute("aria-label", "Available images");

        // Non-blocking failure notice. Sits above the grid instead of replacing
        // it, so a rejected upload never hides the images you can still pick.
        var errorBar = append(surface, "div", "", "rte-gallery-browser-error");
        errorBar.setAttribute("role", "status");
        show(errorBar, false);

        var empty = append(surface, "div", "", "rte-gallery-browser-empty");

        var footer = append(browser, "div", "", "rte-gallery-browser-footer");
        var footerText = append(footer, "div", "", "rte-gallery-browser-footer-text");

        var cancelButton = append(footer, "button", "", "rte-gallery-browser-button");
        cancelButton.type = "button";
        cancelButton.innerText = "Cancel";

        var insertButton = append(footer, "button", "", "rte-gallery-browser-button rte-gallery-browser-button-primary");
        insertButton.type = "button";
        insertButton.innerText = "Insert";

        var state = {
            currentFolder: "",
            currentFolderDisplay: "/",
            parentFolder: null,
            folders: [],
            images: presetImages.slice(0),
            selectedUrl: "",
            loading: false,
            error: "",
            fallbackMode: !serverMode
        };

        function filterList(list) {
            var term = search.value.toLowerCase();
            if (!term) {
                return list.slice(0);
            }

            var items = [];
            for (var index = 0; index < list.length; index++) {
                if (list[index].searchText.indexOf(term) >= 0) {
                    items.push(list[index]);
                }
            }
            return items;
        }

        function setSelected(url) {
            state.selectedUrl = url || "";
            // Picking an image is a fresh action, so a stale failure notice from
            // an earlier upload must not linger next to it.
            state.error = "";
            render();
        }

        function insertSelected() {
            var selected = null;
            for (var index = 0; index < state.images.length; index++) {
                if (state.images[index].url === state.selectedUrl) {
                    selected = state.images[index];
                    break;
                }
            }

            if (!selected) {
                return;
            }

            editor.insertImageByUrl(selected.url);
            closeDialog();
            editor.focus();
        }

        function updateStatus(folderCount, imageCount) {
            var total = folderCount + imageCount;
            var where = serverMode ? (" in " + state.currentFolderDisplay) : "";
            var message = total + " item" + (total === 1 ? "" : "s") + where + ". ";

            if (!state.selectedUrl) {
                status.innerText = message + "No image selected.";
                footerText.innerText = state.fallbackMode && serverMode
                    ? "Showing packaged gallery items. Uploads still save into the current folder."
                    : "Choose an image to enable insert.";
                setDisabled(insertButton, true);
                return;
            }

            var selectedName = getFileName(state.selectedUrl);
            status.innerText = message + "Selected: " + selectedName + ".";
            setDisabled(insertButton, state.loading);

            for (var index = 0; index < state.images.length; index++) {
                if (state.images[index].url === state.selectedUrl) {
                    var size = humanSize(state.images[index].size);
                    footerText.innerText = selectedName + " ready to insert" + (size ? " (" + size + ")." : ".");
                    return;
                }
            }

            footerText.innerText = selectedName + " ready to insert.";
        }

        function createFolderCard(item) {
            var button = append(folderGrid, "button", "", "rte-gallery-browser-card rte-gallery-folder-card");
            button.type = "button";
            button.title = "Open " + item.name;

            var selection = append(button, "div", "", "rte-gallery-browser-selection");
            selection.innerHTML = "&nbsp;";

            var thumbnail = append(button, "div", "", "rte-gallery-browser-thumbnail rte-gallery-browser-thumbnail-folder");
            append(thumbnail, "div", "", "rte-gallery-browser-folder-icon");

            var label = append(button, "div", "", "rte-gallery-browser-name");
            label.innerText = item.name;

            var meta = append(button, "div", "", "rte-gallery-browser-meta");
            meta.innerText = "Folder";

            button.onclick = function () {
                loadFolder(item.folder);
            };
        }

        function createImageCard(item) {
            var isSelected = item.url === state.selectedUrl;
            var button = append(grid, "button", "", "rte-gallery-browser-card rte-gallery-image-card" + (isSelected ? " is-selected" : ""));
            button.type = "button";
            button.title = item.name;
            button.setAttribute("role", "option");
            button.setAttribute("aria-selected", isSelected ? "true" : "false");

            var selection = append(button, "div", "", "rte-gallery-browser-selection");
            selection.innerHTML = isSelected ? "&#10003;" : "&nbsp;";

            var thumbnail = append(button, "div", "", "rte-gallery-browser-thumbnail");
            var image = append(thumbnail, "img", "", "rte-gallery-browser-thumbnail-image");
            image.src = item.thumbnail || item.url;
            image.alt = item.name;

            var label = append(button, "div", "", "rte-gallery-browser-name");
            label.innerText = item.name;

            var meta = append(button, "div", "", "rte-gallery-browser-meta");
            meta.innerText = item.meta || (item.source === "preset" ? "Preset image" : humanSize(item.size)) || item.url;

            button.onclick = function () {
                setSelected(item.url);
            };

            button.ondblclick = function () {
                setSelected(item.url);
                insertSelected();
            };
        }

        // Presets belong to no folder, so they are only offered at the root —
        // otherwise every folder would appear to contain them.
        function mergePresets(serverImages) {
            var merged = [];
            var seen = {};
            var index;

            for (index = 0; index < serverImages.length; index++) {
                merged.push(serverImages[index]);
                seen[serverImages[index].url] = true;
            }

            if (state.currentFolder) {
                return merged;
            }

            for (index = 0; index < presetImages.length; index++) {
                if (!seen[presetImages[index].url]) {
                    merged.push(presetImages[index]);
                }
            }

            return merged;
        }

        function render() {
            var visibleFolders = filterList(state.folders);
            var visibleImages = filterList(state.images);

            path.innerText = state.currentFolderDisplay || "/";
            setDisabled(upButton, state.loading || state.parentFolder === null);
            setDisabled(createFolderButton, state.loading);
            setDisabled(uploadButton, state.loading);
            setDisabled(refreshButton, state.loading);

            folderGrid.innerHTML = "";
            grid.innerHTML = "";
            show(empty, false);
            show(folderGrid, false);
            show(grid, true);

            if (state.loading) {
                empty.innerText = "Loading gallery...";
                show(empty, true);
                show(grid, false);
                updateStatus(0, 0);
                return;
            }

            // An upload failure must not wipe the browser. It used to replace the
            // whole grid, so one rejected file left the dialog reading "0 items"
            // with an error where the images should be - while the footer still
            // said the previously selected image was ready to insert. Two panels
            // contradicting each other. Show it as a banner and keep browsing.
            if (state.error) {
                errorBar.innerText = state.error;
                show(errorBar, true);
            } else {
                show(errorBar, false);
            }

            for (var folderIndex = 0; folderIndex < visibleFolders.length; folderIndex++) {
                createFolderCard(visibleFolders[folderIndex]);
            }
            show(folderGrid, visibleFolders.length > 0);

            for (var imageIndex = 0; imageIndex < visibleImages.length; imageIndex++) {
                createImageCard(visibleImages[imageIndex]);
            }
            show(grid, visibleImages.length > 0);

            updateStatus(visibleFolders.length, visibleImages.length);

            if (!visibleFolders.length && !visibleImages.length) {
                empty.innerText = search.value
                    ? "No folders or images match the current filter."
                    : (serverMode
                        ? "This folder is empty. Create a folder or upload an image to get started."
                        : "No images are available. Upload a file to get started.");
                show(empty, true);
            }
        }

        function applyResponse(payload, fallbackMode) {
            var nextFolders = [];
            var nextImages = [];
            var index;

            state.currentFolder = payload.currentFolder || "";
            state.currentFolderDisplay = payload.currentFolderDisplay || "/";
            state.parentFolder = typeof payload.parentFolder === "undefined" ? null : payload.parentFolder;
            state.fallbackMode = !!fallbackMode;
            state.error = "";

            if (payload.folders) {
                for (index = 0; index < payload.folders.length; index++) {
                    var normalizedFolder = normalizeServerFolder(payload.folders[index]);
                    if (normalizedFolder) {
                        nextFolders.push(normalizedFolder);
                    }
                }
            }

            if (payload.images) {
                for (index = 0; index < payload.images.length; index++) {
                    var normalizedImage = normalizeServerImage(payload.images[index]);
                    if (normalizedImage) {
                        nextImages.push(normalizedImage);
                    }
                }
            }

            state.folders = nextFolders;
            state.images = mergePresets(nextImages);

            if (state.selectedUrl) {
                var stillVisible = false;
                for (index = 0; index < state.images.length; index++) {
                    if (state.images[index].url === state.selectedUrl) {
                        stillVisible = true;
                        break;
                    }
                }
                if (!stillVisible) {
                    state.selectedUrl = "";
                }
            }
        }

        function loadFallback(errorCode) {
            applyResponse({
                currentFolder: "",
                currentFolderDisplay: "/",
                parentFolder: null,
                folders: [],
                images: []
            }, true);
            state.images = presetImages.slice(0);
            state.error = presetImages.length ? "" : ("The image gallery is unavailable right now (" + errorCode + ").");
            state.loading = false;
            render();
        }

        function loadFolder(folder, selectAfterLoad) {
            if (!serverMode) {
                state.images = presetImages.slice(0);
                render();
                return;
            }

            state.loading = true;
            state.error = "";
            render();

            requestJson("GET", withFolder(endpoint, folder), null, function (payload, errorCode) {
                if (errorCode) {
                    loadFallback(errorCode);
                    return;
                }

                applyResponse(payload || {}, false);
                if (selectAfterLoad) {
                    state.selectedUrl = selectAfterLoad;
                }
                state.loading = false;
                render();
            });
        }

        function createFolder() {
            var folderName = window.prompt("New folder name", "");
            if (!folderName) {
                return;
            }

            state.loading = true;
            state.error = "";
            render();

            var formData = new FormData();
            formData.append("action", "create-folder");
            formData.append("folder", state.currentFolder || "");
            formData.append("name", folderName);

            requestJson("POST", endpoint, formData, function (payload, errorCode) {
                if (errorCode) {
                    state.loading = false;
                    state.error = "The folder could not be created right now.";
                    render();
                    return;
                }

                applyResponse(payload || {}, false);
                state.loading = false;
                render();
            });
        }

        function uploadFiles(fileList) {
            var files = [];
            var index;
            for (index = 0; index < fileList.length; index++) {
                files.push(fileList[index]);
            }

            if (!files.length || !canUpload) {
                return;
            }

            var lastUploadedUrl = "";

            function uploadNext(nextIndex) {
                if (nextIndex >= files.length) {
                    if (serverMode) {
                        loadFolder(state.currentFolder, lastUploadedUrl);
                        return;
                    }

                    // No server to re-list from, so fold the upload into the
                    // preset list directly and keep it selected.
                    if (lastUploadedUrl) {
                        var uploaded = normalizePreset(lastUploadedUrl);
                        if (uploaded) {
                            uploaded.source = "upload";
                            presetImages.unshift(uploaded);
                            config.galleryImages.unshift(lastUploadedUrl);
                        }
                        state.selectedUrl = lastUploadedUrl;
                    }
                    state.images = presetImages.slice(0);
                    state.loading = false;
                    render();
                    return;
                }

                var file = files[nextIndex];

                function done(url, errorCode) {
                    if (!url) {
                        state.error = errorCode || ("Upload failed for " + file.name + ".");
                        state.loading = false;
                        render();
                        return;
                    }

                    lastUploadedUrl = url;
                    uploadNext(nextIndex + 1);
                }

                if (uploadToFolder) {
                    window.richTextBoxUploadFile(file, function (url, errorCode) {
                        done(errorCode ? "" : url, errorCode ? ("Upload failed for " + file.name + ".") : "");
                    }, { folder: state.currentFolder }, nextIndex, files);
                    return;
                }

                window.rte_file_upload_handler(file, function (url, error) {
                    done(url, error);
                }, nextIndex, files);
            }

            state.loading = true;
            state.error = "";
            render();
            uploadNext(0);
        }

        upButton.onclick = function () {
            if (state.parentFolder === null) {
                return;
            }
            loadFolder(state.parentFolder);
        };

        createFolderButton.onclick = createFolder;

        uploadButton.onclick = function () {
            fileInput.click();
        };

        fileInput.onchange = function () {
            uploadFiles(this.files);
            this.value = "";
        };

        refreshButton.onclick = function () {
            loadFolder(state.currentFolder, state.selectedUrl);
        };

        search.oninput = render;
        cancelButton.onclick = closeDialog;
        insertButton.onclick = insertSelected;

        if (serverMode) {
            loadFolder("");
        } else {
            render();
        }

        search.focus();
    };
}
