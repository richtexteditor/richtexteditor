using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AspNetCoreMvc
{
	public class Program
	{
		public static void Main(string[] args)
		{
			CreateHostBuilder(args).Build().Run();
		}

		public static IHostBuilder CreateHostBuilder(string[] args) =>
			Host.CreateDefaultBuilder(args)
				.ConfigureLogging((context, logging) =>
				{
					// Keep the demo portable in restricted local environments instead of relying on Windows Event Log access.
					logging.ClearProviders();
					logging.AddConsole();
					logging.AddDebug();
				})
				.ConfigureWebHostDefaults(webBuilder =>
				{
					webBuilder.UseContentRoot(ResolveContentRoot());
					webBuilder.UseStartup<Startup>();
				});

		private static string ResolveContentRoot()
		{
			var currentDirectory = Directory.GetCurrentDirectory();
			if (File.Exists(Path.Combine(currentDirectory, "AspNetCoreMvc.csproj")))
			{
				return currentDirectory;
			}

			return AppContext.BaseDirectory;
		}
	}
}
