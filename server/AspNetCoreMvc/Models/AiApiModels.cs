using System.Text.Json;

namespace AspNetCoreMvc.Models
{
	public class AiSettingsRequest
	{
		public string Mode { get; set; }
		public string ApiBaseUrl { get; set; }
		public string Model { get; set; }
		public string ApiKey { get; set; }
		public string SystemPrompt { get; set; }
		public double? Temperature { get; set; }
		public bool PreserveExistingApiKey { get; set; } = true;
	}

	public class AiSettingsResponse
	{
		public string Mode { get; set; }
		public string ApiBaseUrl { get; set; }
		public string Model { get; set; }
		public string SystemPrompt { get; set; }
		public double Temperature { get; set; }
		public bool ApiKeyConfigured { get; set; }
	}

	public class AiProviderSettingsSnapshot
	{
		public string Mode { get; set; }
		public string ApiBaseUrl { get; set; }
		public string Model { get; set; }
		public string ApiKey { get; set; }
		public string SystemPrompt { get; set; }
		public double Temperature { get; set; }
	}

	public class AiSuggestionRunRequest
	{
		public string Action { get; set; }
		public string Tone { get; set; }
		public string Instruction { get; set; }
		public string AnchorText { get; set; }
		public int? AnchorRevision { get; set; }
		public int? AnchorStartOffset { get; set; }
		public int? AnchorEndOffset { get; set; }
		public int[] AnchorStartTextNodePath { get; set; }
		public int? AnchorStartTextNodeOffset { get; set; }
		public int[] AnchorEndTextNodePath { get; set; }
		public int? AnchorEndTextNodeOffset { get; set; }
		public int[] AnchorTextNodePath { get; set; }
		public int? AnchorTextNodeStartOffset { get; set; }
		public int? AnchorTextNodeEndOffset { get; set; }
		public int[] AnchorBlockPath { get; set; }
		public string AnchorBlockType { get; set; }
		public int? AnchorBlockStartOffset { get; set; }
		public int? AnchorBlockEndOffset { get; set; }
		public string AnchorContextBefore { get; set; }
		public string AnchorContextAfter { get; set; }
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
		public JsonElement Document { get; set; }
	}

	public class AiSuggestionRunResponse
	{
		public string Mode { get; set; }
		public string Provider { get; set; }
		public string Action { get; set; }
		public string Message { get; set; }
		public SuggestionResponse Suggestion { get; set; }
	}
}
