using AspNetCoreMvc.Models;
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace AspNetCoreMvc.Services
{
	public class AiSettingsStore
	{
		private static readonly JsonSerializerOptions StorageJsonOptions = new JsonSerializerOptions
		{
			PropertyNameCaseInsensitive = true,
			WriteIndented = true
		};

		private readonly SemaphoreSlim _mutex = new SemaphoreSlim(1, 1);
		private readonly string _settingsPath;

		public AiSettingsStore(IWebHostEnvironment env)
		{
			var appDataPath = Path.Combine(env.ContentRootPath, "App_Data");
			Directory.CreateDirectory(appDataPath);
			_settingsPath = Path.Combine(appDataPath, "ai-settings.json");
		}

		public async Task<AiSettingsResponse> GetAsync()
		{
			var stored = await GetStoredSettingsAsync();
			return ToResponse(stored);
		}

		public async Task<AiProviderSettingsSnapshot> GetStoredSettingsAsync()
		{
			await _mutex.WaitAsync();
			try
			{
				return await ReadStoredSettingsAsync();
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<AiSettingsResponse> SaveAsync(AiSettingsRequest request)
		{
			await _mutex.WaitAsync();
			try
			{
				var existing = await ReadStoredSettingsAsync();
				var next = NormalizeRequest(request, existing);
				var json = JsonSerializer.Serialize(next, StorageJsonOptions);
				await File.WriteAllTextAsync(_settingsPath, json);
				return ToResponse(next);
			}
			finally
			{
				_mutex.Release();
			}
		}

		private async Task<AiProviderSettingsSnapshot> ReadStoredSettingsAsync()
		{
			if (!File.Exists(_settingsPath))
			{
				return BuildDefaultSettings();
			}

			var json = await File.ReadAllTextAsync(_settingsPath);
			var stored = JsonSerializer.Deserialize<AiProviderSettingsSnapshot>(json, StorageJsonOptions);
			return NormalizeStoredSettings(stored);
		}

		private static AiProviderSettingsSnapshot BuildDefaultSettings()
		{
			return new AiProviderSettingsSnapshot
			{
				Mode = "demo",
				ApiBaseUrl = "https://api.openai.com",
				Model = "gpt-4.1-mini",
				SystemPrompt = "You are a careful writing assistant. Return only the revised replacement text for the selected content.",
				Temperature = 0.2
			};
		}

		private static AiProviderSettingsSnapshot NormalizeStoredSettings(AiProviderSettingsSnapshot stored)
		{
			stored ??= BuildDefaultSettings();
			return new AiProviderSettingsSnapshot
			{
				Mode = NormalizeMode(stored.Mode),
				ApiBaseUrl = NormalizeApiBaseUrl(stored.ApiBaseUrl),
				Model = NormalizeModel(stored.Model),
				ApiKey = string.IsNullOrWhiteSpace(stored.ApiKey) ? null : stored.ApiKey.Trim(),
				SystemPrompt = NormalizeSystemPrompt(stored.SystemPrompt),
				Temperature = NormalizeTemperature(stored.Temperature)
			};
		}

		private static AiProviderSettingsSnapshot NormalizeRequest(AiSettingsRequest request, AiProviderSettingsSnapshot existing)
		{
			existing ??= BuildDefaultSettings();
			request ??= new AiSettingsRequest();

			var nextApiKey = request.PreserveExistingApiKey && string.IsNullOrWhiteSpace(request.ApiKey)
				? existing.ApiKey
				: NormalizeApiKey(request.ApiKey);

			return new AiProviderSettingsSnapshot
			{
				Mode = NormalizeMode(request.Mode),
				ApiBaseUrl = NormalizeApiBaseUrl(request.ApiBaseUrl),
				Model = NormalizeModel(request.Model),
				ApiKey = nextApiKey,
				SystemPrompt = NormalizeSystemPrompt(request.SystemPrompt),
				Temperature = NormalizeTemperature(request.Temperature ?? existing.Temperature)
			};
		}

		private static AiSettingsResponse ToResponse(AiProviderSettingsSnapshot stored)
		{
			return new AiSettingsResponse
			{
				Mode = stored.Mode,
				ApiBaseUrl = stored.ApiBaseUrl,
				Model = stored.Model,
				SystemPrompt = stored.SystemPrompt,
				Temperature = stored.Temperature,
				ApiKeyConfigured = !string.IsNullOrWhiteSpace(stored.ApiKey)
			};
		}

		private static string NormalizeMode(string value)
		{
			return string.Equals(value, "openai-compatible", StringComparison.OrdinalIgnoreCase)
				? "openai-compatible"
				: "demo";
		}

		private static string NormalizeApiBaseUrl(string value)
		{
			if (string.IsNullOrWhiteSpace(value))
			{
				return "https://api.openai.com";
			}

			return value.Trim().TrimEnd('/');
		}

		private static string NormalizeModel(string value)
		{
			return string.IsNullOrWhiteSpace(value) ? "gpt-4.1-mini" : value.Trim();
		}

		private static string NormalizeSystemPrompt(string value)
		{
			if (string.IsNullOrWhiteSpace(value))
			{
				return "You are a careful writing assistant. Return only the revised replacement text for the selected content.";
			}

			return value.Trim();
		}

		private static string NormalizeApiKey(string value)
		{
			return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
		}

		private static double NormalizeTemperature(double value)
		{
			if (double.IsNaN(value) || double.IsInfinity(value))
			{
				return 0.2;
			}

			return Math.Clamp(value, 0, 2);
		}
	}
}
