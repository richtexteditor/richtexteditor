using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using AspNetCoreMvc.Models;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace AspNetCoreMvc.Controllers
{
	public class HomeController : Controller
	{
		private readonly IWebHostEnvironment _env;

		public HomeController(IWebHostEnvironment env)
		{
			_env = env;
		}

		public IActionResult Index()
		{
			return View();
		}

		[HttpPost]
		public IActionResult Index(string htmlcode)
		{
			ViewData["IsPosted"] = true;
			ViewData["PostedValue"] = htmlcode;
			return View();
		}


		public IActionResult AjaxMode()
		{
			ViewData["HtmlCode"] = GetHtmlFileCode();
			return View();
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
			System.IO.File.WriteAllText(fullpath,htmlcode);
			return Content("OK");
		}

		[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
		public IActionResult Error()
		{
			return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
		}


	}
}
