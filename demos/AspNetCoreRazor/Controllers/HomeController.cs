using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace AspNetCoreRazor.Controllers
{
	public class HomeController : Controller
	{
		private readonly IWebHostEnvironment _env;

		public HomeController(IWebHostEnvironment env)
		{
			_env = env;
		}


		string GetHtmlFileCode()
		{
			string fullpath = GetHtmlFilePath();
			if (!System.IO.File.Exists(fullpath))
				return "<b>No saved data yet</b>";
			return System.IO.File.ReadAllText(fullpath);
		}
		string GetHtmlFilePath()
		{
			string filename = "/usertyped_htmlcontent.html";
			string fullpath = Path.Combine(_env.WebRootPath, filename.TrimStart('/'));
			return fullpath;
		}

		public IActionResult AjaxLoadHandler()
		{
			return Content(GetHtmlFileCode(), "text/html");
		}

		[HttpPost]
		public IActionResult AjaxSaveHandler(string htmlcode)
		{
			string fullpath = GetHtmlFilePath();
			System.IO.File.WriteAllText(fullpath, htmlcode);
			return Content("OK");
		}

	}
}
