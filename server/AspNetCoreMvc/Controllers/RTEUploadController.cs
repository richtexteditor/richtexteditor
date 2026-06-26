using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace AspNetCoreMvc.Controllers
{
	public class RTEUploadController : Controller
	{
		private readonly ILogger<RTEUploadController> _logger;
		private readonly IWebHostEnvironment _env;

		public RTEUploadController(IWebHostEnvironment env, ILogger<RTEUploadController> logger)
		{
			_env = env;
			_logger = logger;
		}

		IActionResult ReportError(string msg)
		{
			Response.ContentType = "text/plain";
			Response.StatusCode = 500;
			return Content("ERROR:" + msg);
		}

		async Task<byte[]> FullReadDataAsync()
		{
			byte[] data = new byte[(int)Request.ContentLength];
			int len = 0;
			while (len < data.Length)
			{
				int rc = await Request.Body.ReadAsync(data, len, data.Length - len);
				if (rc == 0)
					throw new Exception("Unexpected request data");
				len += rc;
			}
			return data;
		}

		public async Task<IActionResult> ImageUploadHandler(string type, string name)
		{
			if (Request.ContentLength > 4000000)
			{
				return ReportError("file too big");
			}

			string ext = Path.GetExtension(name).ToLower();

			if (type.StartsWith("image/"))
			{
				switch (ext)
				{
					case ".jpeg":
					case ".jpg":
					case ".png":
						break;
					default:
						return ReportError("invalid file extension.");
				}

				byte[] data = await FullReadDataAsync();

				string filename = "/imageuploads/" + DateTime.Now.Ticks + "-" + Guid.NewGuid() + ext;

				string fullpath = Path.Combine(_env.WebRootPath, filename.TrimStart('/'));
				string fulldir = Path.GetDirectoryName(fullpath);
				if (!Directory.Exists(fulldir)) Directory.CreateDirectory(fulldir);

				System.IO.File.WriteAllBytes(fullpath, data);

				return Content("READY:" + filename);

			}
			else
			{
				switch (ext)
				{
					case ".zip":
					case ".rar":
					case ".pdf":
					case ".doc":
					case ".docx":
					case ".xls":
					case ".xlsx":
					case ".rtf":
					case ".txt":
						break;
					default:
						return ReportError("Invalid file extension");
				}

				string filename = "/imageuploads/" + DateTime.Now.Ticks + "-" + Guid.NewGuid() + ext;

				byte[] data = await FullReadDataAsync();

				string fullpath = Path.Combine(_env.WebRootPath, filename.TrimStart('/'));
				string fulldir = Path.GetDirectoryName(fullpath);
				if (!Directory.Exists(fulldir)) Directory.CreateDirectory(fulldir);

				System.IO.File.WriteAllBytes(fullpath, data);

				return Content("READY:" + filename);


			}
		}
	}
}
