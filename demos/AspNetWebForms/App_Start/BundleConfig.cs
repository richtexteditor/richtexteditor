using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Optimization;
using System.Web.UI;

namespace AspNetWebForms
{
	public class BundleConfig
	{
		public static void RegisterBundles(BundleCollection bundles)
		{
			bundles.Add(new ScriptBundle("~/bundles/WebFormsJs").Include(
							"~/Scripts/WebForms/WebForms.js",
							"~/Scripts/WebForms/WebUIValidation.js",
							"~/Scripts/WebForms/MenuStandards.js",
							"~/Scripts/WebForms/Focus.js",
							"~/Scripts/WebForms/GridView.js",
							"~/Scripts/WebForms/DetailsView.js",
							"~/Scripts/WebForms/TreeView.js",
							"~/Scripts/WebForms/WebParts.js"));

			bundles.Add(new ScriptBundle("~/bundles/MsAjaxJs").Include(
					"~/Scripts/WebForms/MsAjax/MicrosoftAjax.js",
					"~/Scripts/WebForms/MsAjax/MicrosoftAjaxApplicationServices.js",
					"~/Scripts/WebForms/MsAjax/MicrosoftAjaxTimer.js",
					"~/Scripts/WebForms/MsAjax/MicrosoftAjaxWebForms.js"));

			bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
							"~/Scripts/modernizr-*"));
		}
	}
}