//This file is a demo of client script for RTE uploading function




//HomeController.cs 
var uploadhandlerpath = "/RTEUpload/ImageUploadHandler";


function rte_file_upload_handler(file, callback, optionalIndex, optionalFiles) {

	function append(parent, tagname, csstext) {
		var tag = parent.ownerDocument.createElement(tagname);
		if (csstext) tag.style.cssText = csstext;
		parent.appendChild(tag);
		return tag;
	}

	var uploadcancelled = false;

	var dialogouter = append(document.body, "div", "display:flex;align-items:center;justify-content:center;z-index:999999;position:fixed;left:0px;top:0px;width:100%;height:100%;background-color:rgba(128,128,128,0.5)");
	var dialoginner = append(dialogouter, "div", "background-color:white;border:solid 1px gray;border-radius:15px;padding:15px;min-width:200px;box-shadow:2px 2px 6px #7777");

	var line1 = append(dialoginner, "div", "text-align:center;font-size:1.2em;margin:0.5em;");
	line1.innerText = "Uploading...";

	var totalsize = file.size;
	var sentsize = 0;

	if (optionalFiles && optionalFiles.length > 1) {
		totalsize = 0;
		for (var i = 0; i < optionalFiles.length; i++) {
			totalsize += optionalFiles[i].size;
			if (i < optionalIndex) sentsize = totalsize;
		}
		console.log(totalsize, optionalIndex, optionalFiles)
		line1.innerText = "Uploading..." + (optionalIndex + 1) + "/" + optionalFiles.length;
	}


	var line2 = append(dialoginner, "div", "text-align:center;font-size:1.0em;margin:0.5em;");
	line2.innerText = "0%";

	var progressbar = append(dialoginner, "div", "border:solid 1px gray;margin:0.5em;");
	var progressbg = append(progressbar, "div", "height:12px");

	var line3 = append(dialoginner, "div", "text-align:center;font-size:1.0em;margin:0.5em;");
	var btn = append(line3, "button");
	btn.className = "btn btn-primary";
	btn.innerText = "cancel";
	btn.onclick = function () {
		uploadcancelled = true;
		xh.abort();
	}

	var xh = new XMLHttpRequest();
	xh.open("POST", uploadhandlerpath + "?name=" + encodeURIComponent(file.name) + "&type=" + encodeURIComponent(file.type) + "&size=" + file.size, true);
	xh.onload = xh.onabort = xh.onerror = function (pe) {
		console.log(pe);
		console.log(xh);
		dialogouter.parentNode.removeChild(dialogouter);
		if (pe.type == "load") {
			console.log(xh)
			if (xh.status != 200) {
				console.log("uploaderror", pe);
				if (xh.responseText.startsWith("ERROR:")) {
					callback(null, "http-error-" + xh.responseText.substring(6));
				}
				else {
					callback(null, "http-error-" + xh.status);
				}
			}
			else if (xh.responseText.startsWith("READY:")) {
				console.log("File uploaded to " + xh.responseText.substring(6));
				callback(xh.responseText.substring(6));
			}
			else {
				callback(null, "http-error-" + xh.responseText);
			}
		}
		else if (uploadcancelled) {
			console.log("uploadcancelled", pe);
			callback(null, "cancelled");
		}
		else {
			console.log("uploaderror", pe);
			callback(null, pe.type);
		}
	}
	xh.upload.onprogress = function (pe) {
		console.log(pe);
		//pe.total
		var percent = Math.floor(100 * (sentsize + pe.loaded) / totalsize);
		line2.innerText = percent + "%";

		progressbg.style.cssText = "background-color:green;width:" + (percent * progressbar.offsetWidth / 100) + "px;height:12px;";
	}
	xh.send(file);
}






