using AspNetCoreMvc.Models;
using AspNetCoreMvc.Services;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace AspNetCoreMvc.Controllers
{
	[ApiController]
	[Route("api/ai")]
	public class AiController : ControllerBase
	{
		private readonly AiSettingsStore _settingsStore;

		public AiController(AiSettingsStore settingsStore)
		{
			_settingsStore = settingsStore;
		}

		[HttpGet("settings")]
		public async Task<ActionResult<AiSettingsResponse>> GetSettings()
		{
			return Ok(await _settingsStore.GetAsync());
		}

		[HttpPut("settings")]
		public async Task<ActionResult<AiSettingsResponse>> SaveSettings([FromBody] AiSettingsRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			return Ok(await _settingsStore.SaveAsync(request));
		}
	}
}
