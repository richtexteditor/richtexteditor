if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-05 Interactive task / checklist. Notion / GitHub / Google-Docs style:
// a list whose items each carry a clickable checkbox; clicking toggles the item
// between open and done (a check + strike-through). Closes a real gap &mdash; the
// editor shipped an orphan `inserttodolist` toolbar icon with no command behind
// it. Checkboxes are styled `contenteditable="false"` spans (not <input>s, which
// misbehave in contenteditable); the done state lives in `data-checked`, so the
// list round-trips through getHTMLCode and re-binds on load via event delegation.
RTE_DefaultConfig.plugin_todolist = RTE_Plugin_TodoList;

function RTE_Plugin_TodoList() {
    var obj = this;
    var config, editor, editable, editdoc;

    obj.PluginName = "TodoList";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editable = editor.getEditable();
        editdoc = editor.getDocument();
        editor.attachEvent("exec_command_inserttodolist", function (state) {
            state.returnValue = true;
            obj.InsertTaskList();
        });
        if (!editable) return;
        // Toggle on checkbox click (delegated -> works for loaded/pasted lists too).
        editable.addEventListener("click", function (e) {
            var cb = closestClass(e.target, "rte-task-checkbox", editable);
            if (!cb) return;
            var li = cb.parentNode;
            if (!li || !li.classList || !li.classList.contains("rte-task-item")) return;
            var checked = li.getAttribute("data-checked") === "true";
            li.setAttribute("data-checked", checked ? "false" : "true");
            e.preventDefault();
            fireChange();
        });
        // 2026-10-02 Enter in a task item is handled here. The browser's own Enter made a bare <li>
        // and the keyup below then put the checkbox in FRONT of the caret: in Chromium and Firefox
        // every item after the first saved as <li>two<span class="rte-task-checkbox"></span></li>,
        // Firefox sometimes dropped the typed text altogether, and WebKit put the caret back at
        // the end of the previous item. tools/keyboard/todolist-enter.mjs
        editable.addEventListener("keydown", function (e) {
            if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.keyCode === 229) return;
            try { if (splitTaskItem()) e.preventDefault(); } catch (er) { /* the browser's own Enter */ }
        }, true);
        // Keep items made any other way well-formed: a checkbox + a done state.
        editable.addEventListener("keyup", function (e) {
            if (e.key === "Enter" && !e.shiftKey) obj.Normalize();
        });
        // Inject CSS once the iframe head exists.
        setTimeout(function () { injectStyles(editdoc); }, 0);
    };

    function closestClass(node, cls, root) {
        while (node && node !== root) {
            if (node.nodeType === 1 && node.classList && node.classList.contains(cls)) return node;
            node = node.parentNode;
        }
        return null;
    }
    function fireChange() { if (typeof editor.fireChange === "function") { try { editor.fireChange(); } catch (e) {} } }

    function currentTaskItem() {
        try {
            var s = editor.getSelection();
            if (!s || s.rangeCount === 0) return null;
            var n = s.getRangeAt(0).startContainer;
            return closestClass(n, "rte-task-item", editable);
        } catch (e) { return null; }
    }

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-todolist-styles")) return;
        var css =
            "ul.rte-task-list{list-style:none;margin:.4em 0;padding-left:0;}" +
            "ul.rte-task-list li.rte-task-item{position:relative;padding-left:28px;margin:3px 0;min-height:20px;}" +
            "li.rte-task-item>.rte-task-checkbox{position:absolute;left:0;top:1px;width:18px;height:18px;border:2px solid #94a3b8;" +
            "border-radius:5px;box-sizing:border-box;cursor:pointer;user-select:none;transition:background .12s,border-color .12s;}" +
            "li.rte-task-item>.rte-task-checkbox:hover{border-color:#1d67ba;}" +
            "li.rte-task-item[data-checked='true']>.rte-task-checkbox{background:#1d67ba;border-color:#1d67ba;}" +
            "li.rte-task-item[data-checked='true']>.rte-task-checkbox::after{content:'';position:absolute;left:4px;top:0px;width:6px;height:11px;" +
            "border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);}" +
            "li.rte-task-item[data-checked='true']{color:#94a3b8;text-decoration:line-through;}";
        var st = doc.createElement("style");
        st.id = "rte-todolist-styles";
        st.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
        // A <style> ELEMENT is governed by style-src: under a strict policy the browser
        // drops its rules, leaving this plugin's UI unstyled. The element above stays
        // the path everyone else takes; this re-injects through the CSSOM only when
        // the policy actually emptied it.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(doc, st, "rte-todolist-styles", st.textContent);
        }
    }

    function makeCheckbox() {
        var cb = editdoc.createElement("span");
        cb.className = "rte-task-checkbox";
        cb.setAttribute("contenteditable", "false");
        return cb;
    }

    function isEmptyItem(li) {
        return !/[^\s\u200b]/.test(li.textContent || "") && !li.querySelector("img,iframe,video,audio,svg,object,embed,table");
    }
    // The caret's place in an item that holds only its checkbox: a zero-width text node after
    // it (as InsertTaskList does) - next to a contenteditable="false" span alone, WebKit moves
    // the caret back into the previous item.
    function caretAfterCheckbox(li) {
        var zw = editdoc.createTextNode("\u200b");
        var cb = li.firstChild && li.firstChild.nodeType === 1 && li.firstChild.classList && li.firstChild.classList.contains("rte-task-checkbox") ? li.firstChild : null;
        li.insertBefore(zw, cb ? cb.nextSibling : li.firstChild);
        return zw;
    }
    function placeCaret(node, offset) {
        var r = editdoc.createRange();
        r.setStart(node, offset);
        r.collapse(true);
        var s = editor.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    }
    function newItem() {
        var li = editdoc.createElement("li");
        li.className = "rte-task-item";
        li.setAttribute("data-checked", "false"); // a new item starts open
        li.appendChild(makeCheckbox());
        return li;
    }
    // Enter in a task item: an empty item leaves the list (a paragraph takes its place, the list
    // splits around it); at the start of an item a new open item goes above; otherwise the text
    // after the caret moves into a new open item below, checkbox first, caret before that text.
    function splitTaskItem() {
        var s = editor.getSelection();
        if (!s || s.rangeCount === 0) return false;
        var r = s.getRangeAt(0);
        var li = closestClass(r.startContainer, "rte-task-item", editable);
        if (!li || li !== closestClass(r.endContainer, "rte-task-item", editable) || li.parentNode.nodeName !== "UL") return false;
        if (typeof editor.commitBookmark === "function") { try { editor.commitBookmark(); } catch (er) { /* ignore */ } }
        if (!r.collapsed) r.deleteContents();
        var ul = li.parentNode;
        if (isEmptyItem(li)) {
            var tag = String((config && config.enterKeyTag) || "p").toLowerCase();
            if (tag === "br") tag = "div";
            var p = editdoc.createElement(tag);
            p.appendChild(editdoc.createElement("br"));
            if (li.nextSibling) {
                var rest = ul.cloneNode(false);
                while (li.nextSibling) rest.appendChild(li.nextSibling);
                ul.parentNode.insertBefore(rest, ul.nextSibling);
            }
            ul.parentNode.insertBefore(p, ul.nextSibling);
            ul.removeChild(li);
            if (!ul.querySelector("li")) ul.parentNode.removeChild(ul);
            placeCaret(p, 0);
            fireChange();
            return true;
        }
        var head = editdoc.createRange();
        head.setStart(li, 0);
        head.setEnd(r.startContainer, r.startOffset);
        if (!/[^\s\u200b]/.test(head.toString()) && !head.cloneContents().querySelector("img,iframe,video,audio,svg,object,embed")) {
            var above = newItem();
            caretAfterCheckbox(above);
            ul.insertBefore(above, li);
            fireChange();
            return true;
        }
        var tail = editdoc.createRange();
        tail.setStart(r.startContainer, r.startOffset);
        tail.setEnd(li, li.childNodes.length);
        var moved = tail.extractContents();
        var below = newItem();
        below.appendChild(moved);
        var zw = caretAfterCheckbox(below);
        ul.insertBefore(below, li.nextSibling);
        placeCaret(zw, 1);
        fireChange();
        return true;
    }

    // Ensure every <li> in a task list has a checkbox span + a data-checked value.
    obj.Normalize = function () {
        if (!editable) return;
        var lists = editable.querySelectorAll("ul.rte-task-list");
        for (var i = 0; i < lists.length; i++) {
            var lis = lists[i].children;
            for (var j = 0; j < lis.length; j++) {
                var li = lis[j];
                if (li.nodeName !== "LI") continue;
                li.classList.add("rte-task-item");
                if (li.getAttribute("data-checked") !== "true" && li.getAttribute("data-checked") !== "false")
                    li.setAttribute("data-checked", "false");
                var first = li.firstChild;
                if (!(first && first.nodeType === 1 && first.classList && first.classList.contains("rte-task-checkbox")))
                    li.insertBefore(makeCheckbox(), li.firstChild);
            }
        }
    };

    obj.InsertTaskList = function () {
        injectStyles(editdoc);
        var pendingId = "rte-todo-pending";
        var html = '<ul class="rte-task-list"><li class="rte-task-item" data-checked="false" id="' + pendingId + '">' +
            '<span class="rte-task-checkbox" contenteditable="false"></span>&#8203;</li></ul>';
        editor.insertHTML(html);
        try {
            var li = editdoc.getElementById(pendingId);
            if (li) {
                li.removeAttribute("id");
                // place caret right after the checkbox (in the zero-width text node)
                var r = editdoc.createRange();
                var textNode = li.lastChild; // the &#8203; text node
                if (textNode && textNode.nodeType === 3) r.setStart(textNode, textNode.length);
                else r.setStart(li, li.childNodes.length);
                r.collapse(true);
                var s = editor.getSelection();
                if (s) { s.removeAllRanges(); s.addRange(r); }
            }
        } catch (e) { /* ignore */ }
        editor.focus();
        fireChange();
    };
}
