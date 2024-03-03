<%@ Page Title="Home Page" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="Default.aspx.cs" Inherits="AspNetWebForms._Default" %>

<asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">

	<%
		if (Request.HttpMethod == "POST")
		{
	%>

	<link rel="stylesheet" href="/richtexteditor/runtime/richtexteditor_preview.css" />

	<div class="text-center">
		<h1 class="display-4">HTMLCode</h1>

		<div style="width: 960px; margin: 0 auto; text-align: left; border: solid 1px gray; padding: 8px;">
			<%=Request.Form["htmlcode"] %>
		</div>

	</div>

	<%
		}
		else
		{
	%>

	<link rel="stylesheet" href="/richtexteditor/rte_theme_default.css" />
	<script type="text/javascript" src="/richtexteditor/rte.js"></script>
	<script type="text/javascript" src='/richtexteditor/plugins/all_plugins.js'></script>

	<div class="text-center">
		<h1 class="display-4">Welcome</h1>


		<input name="htmlcode" id="inp_htmlcode" type="hidden" />


		<div id="div_editor1" class="richtexteditor" style="width: 960px; margin: 0 auto;">
		</div>

		<script>
			var editor1 = new RichTextEditor(document.getElementById("div_editor1"));
			editor1.attachEvent("change", function () {
				document.getElementById("inp_htmlcode").value = editor1.getHTMLCode();
			});
		</script>

		<div style="margin: 0 auto; padding: 24px;">
			<button class="btn btn-primary">Submit</button>
		</div>


	</div>

	<%
		}
	%>
</asp:Content>
