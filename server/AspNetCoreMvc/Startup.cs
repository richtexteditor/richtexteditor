using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using AspNetCoreMvc.Services;

namespace AspNetCoreMvc
{
	public class Startup
	{
		public Startup(IConfiguration configuration)
		{
			Configuration = configuration;
		}

		public IConfiguration Configuration { get; }

		// This method gets called by the runtime. Use this method to add services to the container.
		public void ConfigureServices(IServiceCollection services)
		{
			var dataProtectionPath = Path.Combine(AppContext.BaseDirectory, "App_Data", "DataProtection-Keys");
			Directory.CreateDirectory(dataProtectionPath);

			services.AddControllersWithViews();
			services
				.AddDataProtection()
				.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionPath));
			services.AddSingleton<FileDocumentStore>();
			services.AddSingleton<DocumentCollaborationBroker>();
			services.AddSingleton<AiSettingsStore>();
			services.AddHttpClient<AiSuggestionService>();
		}

		// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
		public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
		{
			if (env.IsDevelopment())
			{
				app.UseDeveloperExceptionPage();
			}
			else
			{
				app.UseExceptionHandler("/Home/Error");
				// The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
				app.UseHsts();
			}
			app.UseHttpsRedirection();
			app.UseStaticFiles();
			app.UseWebSockets();
			app.Use(async (context, next) =>
			{
				if (!context.Request.Path.StartsWithSegments("/ws/documents", out var remainingPath))
				{
					await next();
					return;
				}

				var documentId = remainingPath.Value?.Trim('/');
				if (string.IsNullOrWhiteSpace(documentId))
				{
					context.Response.StatusCode = StatusCodes.Status400BadRequest;
					await context.Response.WriteAsync("Document id is required.");
					return;
				}

				if (!context.WebSockets.IsWebSocketRequest)
				{
					context.Response.StatusCode = StatusCodes.Status400BadRequest;
					await context.Response.WriteAsync("A websocket request is required.");
					return;
				}

				var broker = context.RequestServices.GetRequiredService<DocumentCollaborationBroker>();
				var socket = await context.WebSockets.AcceptWebSocketAsync();
				var sessionId = context.Request.Query["sessionId"].FirstOrDefault();
				var displayName = context.Request.Query["displayName"].FirstOrDefault();

				await broker.HandleConnectionAsync(Uri.UnescapeDataString(documentId), sessionId, displayName, socket, context.RequestAborted);
			});

			app.UseRouting();

			app.UseAuthorization();

			app.UseEndpoints(endpoints =>
			{
				endpoints.MapControllerRoute(
					name: "default",
					pattern: "{controller=Home}/{action=Index}/{id?}");
			});
		}
	}
}
