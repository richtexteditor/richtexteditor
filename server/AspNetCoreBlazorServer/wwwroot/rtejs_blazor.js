function RTEJS_Init(div,objref, configjson,htmlcode) {

	console.trace(div, objref, configjson);

	if (htmlcode === null) {
		htmlcode = div.innerHTML.split('<!--!-->').join('');
	}
	div.innerHTML = "";
	console.log(htmlcode);

	var config = null;
	if (configjson) config = JSON.parse(configjson);

	div.rte = new RichTextEditor(div, config);

	div.rte.attachEvent("change", function () {
		var html = div.rte.getHTMLCode();
		objref.invokeMethodAsync("ClientEvent_HtmlCode",html);
	});

	div.rte.setHTMLCode(htmlcode);

}
function RTEJS_Dispose(div) {
	console.trace(div);
}