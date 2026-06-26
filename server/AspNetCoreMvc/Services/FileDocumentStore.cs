using AspNetCoreMvc.Models;
using Microsoft.AspNetCore.Hosting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace AspNetCoreMvc.Services
{
	public class FileDocumentStore
	{
		private const string DocumentFileName = "document.json";
		private const string CommentsFileName = "comments.json";
		private const string SuggestionsFileName = "suggestions.json";
		private static readonly Regex ValidIdPattern = new Regex("^[a-zA-Z0-9_-]+$", RegexOptions.Compiled);
		private static readonly JsonSerializerOptions StorageJsonOptions = new JsonSerializerOptions
		{
			PropertyNameCaseInsensitive = true,
			WriteIndented = true
		};

		private readonly SemaphoreSlim _mutex = new SemaphoreSlim(1, 1);
		private readonly string _rootPath;

		public FileDocumentStore(IWebHostEnvironment env)
		{
			_rootPath = Path.Combine(env.ContentRootPath, "App_Data", "documents");
			Directory.CreateDirectory(_rootPath);
		}

		public async Task<IReadOnlyList<DocumentSummary>> ListAsync()
		{
			await _mutex.WaitAsync();
			try
			{
				var results = new List<DocumentSummary>();
				foreach (var directory in Directory.EnumerateDirectories(_rootPath))
				{
					var stored = await ReadStoredDocumentAsync(GetDocumentFilePath(directory));
					if (stored == null)
					{
						continue;
					}

					results.Add(ToSummary(stored));
				}

				return results
					.OrderByDescending(item => item.UpdatedUtc)
					.ToList();
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<DocumentResponse> CreateAsync(DocumentUpsertRequest request)
		{
			await _mutex.WaitAsync();
			try
			{
				var now = DateTime.UtcNow;
				var documentId = GenerateDocumentId();
				var revisionNumber = 1;
				var revisionId = BuildRevisionId(revisionNumber);
				var documentJson = NormalizeDocumentJson(request.Document);
				var stored = new StoredDocumentFile
				{
					Id = documentId,
					Title = ResolveTitle(request.Title),
					Revision = revisionNumber,
					CurrentRevisionId = revisionId,
					CreatedUtc = now,
					UpdatedUtc = now,
					DocumentJson = documentJson
				};

				var documentDirectory = GetDocumentDirectory(documentId);
				Directory.CreateDirectory(documentDirectory);
				Directory.CreateDirectory(GetRevisionDirectory(documentDirectory));

				await WriteStoredDocumentAsync(GetDocumentFilePath(documentDirectory), stored);
				await WriteStoredRevisionAsync(documentDirectory, CreateRevisionRecord(stored));

				return ToResponse(stored);
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<DocumentResponse> GetAsync(string id)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return null;
			}

			await _mutex.WaitAsync();
			try
			{
				var stored = await ReadStoredDocumentAsync(GetDocumentFilePath(documentDirectory));
				return stored == null ? null : ToResponse(stored);
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<DocumentUpdateResult> UpdateAsync(string id, DocumentUpsertRequest request)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return new DocumentUpdateResult
				{
					NotFound = true
				};
			}

			await _mutex.WaitAsync();
			try
			{
				var documentFilePath = GetDocumentFilePath(documentDirectory);
				var stored = await ReadStoredDocumentAsync(documentFilePath);
				if (stored == null)
				{
					return new DocumentUpdateResult
					{
						NotFound = true
					};
				}

				if (request.ExpectedRevision.HasValue &&
					!request.ForceSave &&
					request.ExpectedRevision.Value != stored.Revision)
				{
					return new DocumentUpdateResult
					{
						Conflict = true,
						ExpectedRevision = request.ExpectedRevision,
						ActualRevision = stored.Revision,
						Document = ToResponse(stored)
					};
				}

				stored.Title = ResolveTitle(request.Title);
				stored.Revision += 1;
				stored.CurrentRevisionId = BuildRevisionId(stored.Revision);
				stored.UpdatedUtc = DateTime.UtcNow;
				stored.DocumentJson = NormalizeDocumentJson(request.Document);

				await WriteStoredDocumentAsync(documentFilePath, stored);
				await WriteStoredRevisionAsync(documentDirectory, CreateRevisionRecord(stored));

				return new DocumentUpdateResult
				{
					Document = ToResponse(stored),
					ExpectedRevision = request.ExpectedRevision,
					ActualRevision = stored.Revision
				};
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<bool> ExistsAsync(string id)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return false;
			}

			await _mutex.WaitAsync();
			try
			{
				return File.Exists(GetDocumentFilePath(documentDirectory));
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<IReadOnlyList<DocumentRevisionSummary>> ListRevisionsAsync(string id)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return Array.Empty<DocumentRevisionSummary>();
			}

			await _mutex.WaitAsync();
			try
			{
				var revisionDirectory = GetRevisionDirectory(documentDirectory);
				if (!Directory.Exists(revisionDirectory))
				{
					return Array.Empty<DocumentRevisionSummary>();
				}

				var revisions = new List<DocumentRevisionSummary>();
				foreach (var revisionPath in Directory.EnumerateFiles(revisionDirectory, "*.json"))
				{
					var revision = await ReadStoredRevisionAsync(revisionPath);
					if (revision == null)
					{
						continue;
					}

					revisions.Add(new DocumentRevisionSummary
					{
						RevisionId = revision.RevisionId,
						Revision = revision.Revision,
						SavedUtc = revision.SavedUtc,
						Title = revision.Title
					});
				}

				return revisions
					.OrderByDescending(item => item.Revision)
					.ToList();
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<DocumentRevisionResponse> GetRevisionAsync(string id, string revisionId)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null || string.IsNullOrWhiteSpace(revisionId))
			{
				return null;
			}

			await _mutex.WaitAsync();
			try
			{
				var revisionPath = Path.Combine(GetRevisionDirectory(documentDirectory), revisionId + ".json");
				var revision = await ReadStoredRevisionAsync(revisionPath);
				if (revision == null)
				{
					return null;
				}

				return ToRevisionResponse(id, revision);
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<IReadOnlyList<CommentThreadResponse>> ListCommentsAsync(string id)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return Array.Empty<CommentThreadResponse>();
			}

			await _mutex.WaitAsync();
			try
			{
				var comments = await ReadStoredCommentsAsync(GetCommentsFilePath(documentDirectory));
				return ToCommentResponses(comments);
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<CommentThreadMutationResult> CreateCommentThreadAsync(string id, CommentThreadCreateRequest request)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return new CommentThreadMutationResult
				{
					NotFound = true
				};
			}

			await _mutex.WaitAsync();
			try
			{
				var documentFilePath = GetDocumentFilePath(documentDirectory);
				if (!File.Exists(documentFilePath))
				{
					return new CommentThreadMutationResult
					{
						NotFound = true
					};
				}

				var commentsPath = GetCommentsFilePath(documentDirectory);
				var storedComments = await ReadStoredCommentsAsync(commentsPath) ?? new StoredCommentsFile();
				var now = DateTime.UtcNow;
				var author = ResolveAuthor(request.ClientDisplayName, request.ClientSessionId);
				var thread = new StoredCommentThreadFile
				{
					ThreadId = GenerateThreadId(),
					Status = "open",
					LinkedSuggestionId = NormalizeOptionalValue(request.LinkedSuggestionId),
					AnchorText = ResolveAnchorText(request.AnchorText),
					AnchorRevision = request.AnchorRevision,
					AnchorStartOffset = NormalizeAnchorOffset(request.AnchorStartOffset),
					AnchorEndOffset = NormalizeAnchorEndOffset(request.AnchorStartOffset, request.AnchorEndOffset),
					AnchorStartTextNodePath = NormalizeAnchorPath(request.AnchorStartTextNodePath),
					AnchorStartTextNodeOffset = NormalizeAnchorOffset(request.AnchorStartTextNodeOffset),
					AnchorEndTextNodePath = NormalizeAnchorPath(request.AnchorEndTextNodePath),
					AnchorEndTextNodeOffset = NormalizeAnchorOffset(request.AnchorEndTextNodeOffset),
					AnchorTextNodePath = NormalizeAnchorPath(request.AnchorTextNodePath),
					AnchorTextNodeStartOffset = NormalizeAnchorOffset(request.AnchorTextNodeStartOffset),
					AnchorTextNodeEndOffset = NormalizeAnchorEndOffset(request.AnchorTextNodeStartOffset, request.AnchorTextNodeEndOffset),
					AnchorBlockPath = NormalizeAnchorPath(request.AnchorBlockPath),
					AnchorBlockType = NormalizeAnchorBlockType(request.AnchorBlockType),
					AnchorBlockStartOffset = NormalizeAnchorOffset(request.AnchorBlockStartOffset),
					AnchorBlockEndOffset = NormalizeAnchorEndOffset(request.AnchorBlockStartOffset, request.AnchorBlockEndOffset),
					AnchorContextBefore = NormalizeAnchorContext(request.AnchorContextBefore),
					AnchorContextAfter = NormalizeAnchorContext(request.AnchorContextAfter),
					CreatedUtc = now,
					UpdatedUtc = now,
					CreatedBy = author,
					Comments = new List<StoredCommentEntryFile>
					{
						new StoredCommentEntryFile
						{
							CommentId = GenerateCommentId(),
							Body = request.Body.Trim(),
							Author = author,
							AuthorSessionId = NormalizeOptionalValue(request.ClientSessionId),
							CreatedUtc = now
						}
					}
				};

				storedComments.Threads.Add(thread);
				await WriteStoredCommentsAsync(commentsPath, storedComments);

				return new CommentThreadMutationResult
				{
					Thread = ToCommentResponse(thread)
				};
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<CommentThreadMutationResult> AddCommentReplyAsync(string id, string threadId, CommentReplyCreateRequest request)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return new CommentThreadMutationResult
				{
					NotFound = true
				};
			}

			await _mutex.WaitAsync();
			try
			{
				var documentFilePath = GetDocumentFilePath(documentDirectory);
				if (!File.Exists(documentFilePath))
				{
					return new CommentThreadMutationResult
					{
						NotFound = true
					};
				}

				var commentsPath = GetCommentsFilePath(documentDirectory);
				var storedComments = await ReadStoredCommentsAsync(commentsPath) ?? new StoredCommentsFile();
				var thread = storedComments.Threads.FirstOrDefault(item => string.Equals(item.ThreadId, threadId, StringComparison.Ordinal));
				if (thread == null)
				{
					return new CommentThreadMutationResult
					{
						ThreadNotFound = true
					};
				}

				var now = DateTime.UtcNow;
				thread.Comments.Add(new StoredCommentEntryFile
				{
					CommentId = GenerateCommentId(),
					Body = request.Body.Trim(),
					Author = ResolveAuthor(request.ClientDisplayName, request.ClientSessionId),
					AuthorSessionId = NormalizeOptionalValue(request.ClientSessionId),
					CreatedUtc = now
				});
				thread.Status = "open";
				thread.ResolvedBy = null;
				thread.ResolvedUtc = null;
				thread.UpdatedUtc = now;

				await WriteStoredCommentsAsync(commentsPath, storedComments);

				return new CommentThreadMutationResult
				{
					Thread = ToCommentResponse(thread)
				};
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<CommentThreadMutationResult> UpdateCommentThreadStatusAsync(string id, string threadId, CommentThreadStatusUpdateRequest request)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return new CommentThreadMutationResult
				{
					NotFound = true
				};
			}

			await _mutex.WaitAsync();
			try
			{
				var documentFilePath = GetDocumentFilePath(documentDirectory);
				if (!File.Exists(documentFilePath))
				{
					return new CommentThreadMutationResult
					{
						NotFound = true
					};
				}

				var commentsPath = GetCommentsFilePath(documentDirectory);
				var storedComments = await ReadStoredCommentsAsync(commentsPath) ?? new StoredCommentsFile();
				var thread = storedComments.Threads.FirstOrDefault(item => string.Equals(item.ThreadId, threadId, StringComparison.Ordinal));
				if (thread == null)
				{
					return new CommentThreadMutationResult
					{
						ThreadNotFound = true
					};
				}

				var now = DateTime.UtcNow;
				var nextStatus = NormalizeCommentThreadStatus(request.Status);
				thread.Status = nextStatus;
				thread.UpdatedUtc = now;
				if (string.Equals(nextStatus, "resolved", StringComparison.Ordinal))
				{
					thread.ResolvedBy = ResolveAuthor(request.ClientDisplayName, request.ClientSessionId);
					thread.ResolvedUtc = now;
				}
				else
				{
					thread.ResolvedBy = null;
					thread.ResolvedUtc = null;
				}

				await WriteStoredCommentsAsync(commentsPath, storedComments);

				return new CommentThreadMutationResult
				{
					Thread = ToCommentResponse(thread)
				};
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<IReadOnlyList<SuggestionResponse>> ListSuggestionsAsync(string id)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return Array.Empty<SuggestionResponse>();
			}

			await _mutex.WaitAsync();
			try
			{
				var suggestions = await ReadStoredSuggestionsAsync(GetSuggestionsFilePath(documentDirectory));
				return ToSuggestionResponses(suggestions);
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<bool> SuggestionExistsAsync(string id, string suggestionId)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null || string.IsNullOrWhiteSpace(suggestionId))
			{
				return false;
			}

			await _mutex.WaitAsync();
			try
			{
				var suggestions = await ReadStoredSuggestionsAsync(GetSuggestionsFilePath(documentDirectory));
				return (suggestions?.Suggestions ?? new List<StoredSuggestionFile>())
					.Any(item => string.Equals(item.SuggestionId, suggestionId, StringComparison.Ordinal));
			}
			finally
			{
				_mutex.Release();
			}
		}

		public async Task<SuggestionMutationResult> CreateSuggestionAsync(string id, SuggestionCreateRequest request)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return new SuggestionMutationResult
				{
					NotFound = true
				};
			}

			await _mutex.WaitAsync();
			try
			{
				var documentFilePath = GetDocumentFilePath(documentDirectory);
				if (!File.Exists(documentFilePath))
				{
					return new SuggestionMutationResult
					{
						NotFound = true
					};
				}

				var suggestionsPath = GetSuggestionsFilePath(documentDirectory);
				var storedSuggestions = await ReadStoredSuggestionsAsync(suggestionsPath) ?? new StoredSuggestionsFile();
				var now = DateTime.UtcNow;
				var author = ResolveAuthor(request.ClientDisplayName, request.ClientSessionId);
				var suggestion = new StoredSuggestionFile
				{
					SuggestionId = GenerateSuggestionId(),
					Type = NormalizeSuggestionType(request.Type),
					Status = "open",
					Body = NormalizeSuggestionValue(request.Body),
					SuggestedText = NormalizeSuggestionValue(request.SuggestedText),
					AnchorText = NormalizeSuggestionValue(request.AnchorText),
					AnchorRevision = request.AnchorRevision,
					AnchorStartOffset = NormalizeAnchorOffset(request.AnchorStartOffset),
					AnchorEndOffset = NormalizeAnchorEndOffset(request.AnchorStartOffset, request.AnchorEndOffset),
					AnchorStartTextNodePath = NormalizeAnchorPath(request.AnchorStartTextNodePath),
					AnchorStartTextNodeOffset = NormalizeAnchorOffset(request.AnchorStartTextNodeOffset),
					AnchorEndTextNodePath = NormalizeAnchorPath(request.AnchorEndTextNodePath),
					AnchorEndTextNodeOffset = NormalizeAnchorOffset(request.AnchorEndTextNodeOffset),
					AnchorTextNodePath = NormalizeAnchorPath(request.AnchorTextNodePath),
					AnchorTextNodeStartOffset = NormalizeAnchorOffset(request.AnchorTextNodeStartOffset),
					AnchorTextNodeEndOffset = NormalizeAnchorEndOffset(request.AnchorTextNodeStartOffset, request.AnchorTextNodeEndOffset),
					AnchorBlockPath = NormalizeAnchorPath(request.AnchorBlockPath),
					AnchorBlockType = NormalizeAnchorBlockType(request.AnchorBlockType),
					AnchorBlockStartOffset = NormalizeAnchorOffset(request.AnchorBlockStartOffset),
					AnchorBlockEndOffset = NormalizeAnchorEndOffset(request.AnchorBlockStartOffset, request.AnchorBlockEndOffset),
					AnchorContextBefore = NormalizeAnchorContext(request.AnchorContextBefore),
					AnchorContextAfter = NormalizeAnchorContext(request.AnchorContextAfter),
					CreatedUtc = now,
					UpdatedUtc = now,
					CreatedBy = author
				};

				storedSuggestions.Suggestions.Add(suggestion);
				await WriteStoredSuggestionsAsync(suggestionsPath, storedSuggestions);

				return new SuggestionMutationResult
				{
					Suggestion = ToSuggestionResponse(suggestion)
				};
			}
			finally
			{
				_mutex.Release();
			}
		}

		public Task<SuggestionMutationResult> AcceptSuggestionAsync(string id, string suggestionId, SuggestionDecisionRequest request)
		{
			return UpdateSuggestionStatusAsync(id, suggestionId, "accepted", request);
		}

		public Task<SuggestionMutationResult> RejectSuggestionAsync(string id, string suggestionId, SuggestionDecisionRequest request)
		{
			return UpdateSuggestionStatusAsync(id, suggestionId, "rejected", request);
		}

		private async Task<SuggestionMutationResult> UpdateSuggestionStatusAsync(string id, string suggestionId, string status, SuggestionDecisionRequest request)
		{
			var documentDirectory = GetDocumentDirectoryOrNull(id);
			if (documentDirectory == null)
			{
				return new SuggestionMutationResult
				{
					NotFound = true
				};
			}

			await _mutex.WaitAsync();
			try
			{
				var documentFilePath = GetDocumentFilePath(documentDirectory);
				if (!File.Exists(documentFilePath))
				{
					return new SuggestionMutationResult
					{
						NotFound = true
					};
				}

				var suggestionsPath = GetSuggestionsFilePath(documentDirectory);
				var storedSuggestions = await ReadStoredSuggestionsAsync(suggestionsPath) ?? new StoredSuggestionsFile();
				var suggestion = storedSuggestions.Suggestions.FirstOrDefault(item => string.Equals(item.SuggestionId, suggestionId, StringComparison.Ordinal));
				if (suggestion == null)
				{
					return new SuggestionMutationResult
					{
						SuggestionNotFound = true
					};
				}

				var now = DateTime.UtcNow;
				suggestion.Status = NormalizeSuggestionStatus(status);
				suggestion.UpdatedUtc = now;
				suggestion.DecidedBy = ResolveAuthor(request?.ClientDisplayName, request?.ClientSessionId);
				suggestion.DecidedUtc = now;

				await WriteStoredSuggestionsAsync(suggestionsPath, storedSuggestions);

				return new SuggestionMutationResult
				{
					Suggestion = ToSuggestionResponse(suggestion)
				};
			}
			finally
			{
				_mutex.Release();
			}
		}

		private static string ResolveTitle(string title)
		{
			return string.IsNullOrWhiteSpace(title) ? "Untitled document" : title.Trim();
		}

		private static string ResolveAuthor(string displayName, string sessionId)
		{
			if (!string.IsNullOrWhiteSpace(displayName))
			{
				return displayName.Trim();
			}

			if (!string.IsNullOrWhiteSpace(sessionId))
			{
				var trimmed = sessionId.Trim();
				return "Editor " + trimmed.Substring(0, Math.Min(trimmed.Length, 6));
			}

			return "Unknown editor";
		}

		private static string ResolveAnchorText(string anchorText)
		{
			return string.IsNullOrWhiteSpace(anchorText) ? "(No anchor provided)" : anchorText.Trim();
		}

		private static int[] NormalizeAnchorPath(int[] value)
		{
			if (value == null || value.Length == 0)
			{
				return null;
			}

			var normalized = value
				.Where(segment => segment >= 0)
				.ToArray();

			return normalized.Length == value.Length ? normalized : null;
		}

		private static string NormalizeAnchorBlockType(string value)
		{
			if (string.IsNullOrWhiteSpace(value))
			{
				return null;
			}

			var trimmed = value.Trim();
			return trimmed.Length <= 40 ? trimmed : trimmed.Substring(0, 40);
		}

		private static int? NormalizeAnchorOffset(int? value)
		{
			return value.HasValue && value.Value >= 0 ? value.Value : (int?)null;
		}

		private static int? NormalizeAnchorEndOffset(int? startOffset, int? endOffset)
		{
			var normalizedEnd = NormalizeAnchorOffset(endOffset);
			if (!normalizedEnd.HasValue)
			{
				return null;
			}

			var normalizedStart = NormalizeAnchorOffset(startOffset);
			if (normalizedStart.HasValue && normalizedEnd.Value < normalizedStart.Value)
			{
				return null;
			}

			return normalizedEnd;
		}

		private static string NormalizeAnchorContext(string value)
		{
			if (string.IsNullOrWhiteSpace(value))
			{
				return null;
			}

			var trimmed = value.Trim();
			return trimmed.Length <= 80 ? trimmed : trimmed.Substring(0, 80);
		}

		private static string NormalizeCommentThreadStatus(string status)
		{
			return string.Equals(status, "resolved", StringComparison.OrdinalIgnoreCase) ? "resolved" : "open";
		}

		private static string NormalizeSuggestionType(string value)
		{
			if (string.IsNullOrWhiteSpace(value))
			{
				return "format";
			}

			return value.Trim().ToLowerInvariant();
		}

		private static string NormalizeSuggestionStatus(string value)
		{
			if (string.Equals(value, "accepted", StringComparison.OrdinalIgnoreCase))
			{
				return "accepted";
			}

			if (string.Equals(value, "rejected", StringComparison.OrdinalIgnoreCase))
			{
				return "rejected";
			}

			return "open";
		}

		private static string NormalizeSuggestionValue(string value)
		{
			if (string.IsNullOrWhiteSpace(value))
			{
				return null;
			}

			return value.Trim();
		}

		private static string NormalizeOptionalValue(string value)
		{
			return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
		}

		private static string GenerateDocumentId()
		{
			return "doc_" + Guid.NewGuid().ToString("N").Substring(0, 12);
		}

		private static string GenerateThreadId()
		{
			return "thread_" + Guid.NewGuid().ToString("N").Substring(0, 12);
		}

		private static string GenerateCommentId()
		{
			return "comment_" + Guid.NewGuid().ToString("N").Substring(0, 12);
		}

		private static string GenerateSuggestionId()
		{
			return "suggestion_" + Guid.NewGuid().ToString("N").Substring(0, 12);
		}

		private static string BuildRevisionId(int revision)
		{
			return "rev-" + revision.ToString("D4");
		}

		private static string NormalizeDocumentJson(JsonElement document)
		{
			using var normalized = JsonDocument.Parse(document.GetRawText());
			return JsonSerializer.Serialize(normalized.RootElement, StorageJsonOptions);
		}

		private static JsonElement ParseDocumentJson(string documentJson)
		{
			using var jsonDocument = JsonDocument.Parse(documentJson);
			return jsonDocument.RootElement.Clone();
		}

		private static DocumentResponse ToResponse(StoredDocumentFile stored)
		{
			return new DocumentResponse
			{
				Id = stored.Id,
				Title = stored.Title,
				Revision = stored.Revision,
				CurrentRevisionId = stored.CurrentRevisionId,
				CreatedUtc = stored.CreatedUtc,
				UpdatedUtc = stored.UpdatedUtc,
				Document = ParseDocumentJson(stored.DocumentJson)
			};
		}

		private static DocumentSummary ToSummary(StoredDocumentFile stored)
		{
			return new DocumentSummary
			{
				Id = stored.Id,
				Title = stored.Title,
				Revision = stored.Revision,
				CurrentRevisionId = stored.CurrentRevisionId,
				CreatedUtc = stored.CreatedUtc,
				UpdatedUtc = stored.UpdatedUtc
			};
		}

		private static DocumentRevisionResponse ToRevisionResponse(string documentId, StoredRevisionFile stored)
		{
			return new DocumentRevisionResponse
			{
				DocumentId = documentId,
				RevisionId = stored.RevisionId,
				Revision = stored.Revision,
				SavedUtc = stored.SavedUtc,
				Title = stored.Title,
				Document = ParseDocumentJson(stored.DocumentJson)
			};
		}

		private static IReadOnlyList<CommentThreadResponse> ToCommentResponses(StoredCommentsFile storedComments)
		{
			if (storedComments == null || storedComments.Threads == null || storedComments.Threads.Count == 0)
			{
				return Array.Empty<CommentThreadResponse>();
			}

			return storedComments.Threads
				.OrderByDescending(item => item.UpdatedUtc)
				.Select(ToCommentResponse)
				.ToList();
		}

		private static IReadOnlyList<SuggestionResponse> ToSuggestionResponses(StoredSuggestionsFile storedSuggestions)
		{
			if (storedSuggestions == null || storedSuggestions.Suggestions == null || storedSuggestions.Suggestions.Count == 0)
			{
				return Array.Empty<SuggestionResponse>();
			}

			return storedSuggestions.Suggestions
				.OrderByDescending(item => item.UpdatedUtc)
				.Select(ToSuggestionResponse)
				.ToList();
		}

		private static CommentThreadResponse ToCommentResponse(StoredCommentThreadFile thread)
		{
			return new CommentThreadResponse
			{
				ThreadId = thread.ThreadId,
				Status = thread.Status,
				LinkedSuggestionId = thread.LinkedSuggestionId,
				AnchorText = thread.AnchorText,
				AnchorRevision = thread.AnchorRevision,
				AnchorStartOffset = thread.AnchorStartOffset,
				AnchorEndOffset = thread.AnchorEndOffset,
				AnchorStartTextNodePath = thread.AnchorStartTextNodePath == null ? null : thread.AnchorStartTextNodePath.ToArray(),
				AnchorStartTextNodeOffset = thread.AnchorStartTextNodeOffset,
				AnchorEndTextNodePath = thread.AnchorEndTextNodePath == null ? null : thread.AnchorEndTextNodePath.ToArray(),
				AnchorEndTextNodeOffset = thread.AnchorEndTextNodeOffset,
				AnchorTextNodePath = thread.AnchorTextNodePath == null ? null : thread.AnchorTextNodePath.ToArray(),
				AnchorTextNodeStartOffset = thread.AnchorTextNodeStartOffset,
				AnchorTextNodeEndOffset = thread.AnchorTextNodeEndOffset,
				AnchorBlockPath = thread.AnchorBlockPath == null ? null : thread.AnchorBlockPath.ToArray(),
				AnchorBlockType = thread.AnchorBlockType,
				AnchorBlockStartOffset = thread.AnchorBlockStartOffset,
				AnchorBlockEndOffset = thread.AnchorBlockEndOffset,
				AnchorContextBefore = thread.AnchorContextBefore,
				AnchorContextAfter = thread.AnchorContextAfter,
				CreatedUtc = thread.CreatedUtc,
				UpdatedUtc = thread.UpdatedUtc,
				CreatedBy = thread.CreatedBy,
				ResolvedUtc = thread.ResolvedUtc,
				ResolvedBy = thread.ResolvedBy,
				Comments = (thread.Comments ?? new List<StoredCommentEntryFile>())
					.OrderBy(item => item.CreatedUtc)
					.Select(comment => new CommentMessageResponse
					{
						CommentId = comment.CommentId,
						Body = comment.Body,
						Author = comment.Author,
						AuthorSessionId = comment.AuthorSessionId,
						CreatedUtc = comment.CreatedUtc
					})
					.ToArray()
			};
		}

		private static SuggestionResponse ToSuggestionResponse(StoredSuggestionFile suggestion)
		{
			return new SuggestionResponse
			{
				SuggestionId = suggestion.SuggestionId,
				Type = suggestion.Type,
				Status = suggestion.Status,
				Body = suggestion.Body,
				SuggestedText = suggestion.SuggestedText,
				AnchorText = suggestion.AnchorText,
				AnchorRevision = suggestion.AnchorRevision,
				AnchorStartOffset = suggestion.AnchorStartOffset,
				AnchorEndOffset = suggestion.AnchorEndOffset,
				AnchorStartTextNodePath = suggestion.AnchorStartTextNodePath == null ? null : suggestion.AnchorStartTextNodePath.ToArray(),
				AnchorStartTextNodeOffset = suggestion.AnchorStartTextNodeOffset,
				AnchorEndTextNodePath = suggestion.AnchorEndTextNodePath == null ? null : suggestion.AnchorEndTextNodePath.ToArray(),
				AnchorEndTextNodeOffset = suggestion.AnchorEndTextNodeOffset,
				AnchorTextNodePath = suggestion.AnchorTextNodePath == null ? null : suggestion.AnchorTextNodePath.ToArray(),
				AnchorTextNodeStartOffset = suggestion.AnchorTextNodeStartOffset,
				AnchorTextNodeEndOffset = suggestion.AnchorTextNodeEndOffset,
				AnchorBlockPath = suggestion.AnchorBlockPath == null ? null : suggestion.AnchorBlockPath.ToArray(),
				AnchorBlockType = suggestion.AnchorBlockType,
				AnchorBlockStartOffset = suggestion.AnchorBlockStartOffset,
				AnchorBlockEndOffset = suggestion.AnchorBlockEndOffset,
				AnchorContextBefore = suggestion.AnchorContextBefore,
				AnchorContextAfter = suggestion.AnchorContextAfter,
				CreatedUtc = suggestion.CreatedUtc,
				UpdatedUtc = suggestion.UpdatedUtc,
				CreatedBy = suggestion.CreatedBy,
				DecidedUtc = suggestion.DecidedUtc,
				DecidedBy = suggestion.DecidedBy
			};
		}

		private static StoredRevisionFile CreateRevisionRecord(StoredDocumentFile stored)
		{
			return new StoredRevisionFile
			{
				RevisionId = stored.CurrentRevisionId,
				Revision = stored.Revision,
				SavedUtc = stored.UpdatedUtc,
				Title = stored.Title,
				DocumentJson = stored.DocumentJson
			};
		}

		private static async Task<StoredDocumentFile> ReadStoredDocumentAsync(string path)
		{
			if (!File.Exists(path))
			{
				return null;
			}

			var json = await File.ReadAllTextAsync(path);
			return JsonSerializer.Deserialize<StoredDocumentFile>(json, StorageJsonOptions);
		}

		private static async Task<StoredRevisionFile> ReadStoredRevisionAsync(string path)
		{
			if (!File.Exists(path))
			{
				return null;
			}

			var json = await File.ReadAllTextAsync(path);
			return JsonSerializer.Deserialize<StoredRevisionFile>(json, StorageJsonOptions);
		}

		private static async Task<StoredCommentsFile> ReadStoredCommentsAsync(string path)
		{
			if (!File.Exists(path))
			{
				return new StoredCommentsFile();
			}

			var json = await File.ReadAllTextAsync(path);
			var stored = JsonSerializer.Deserialize<StoredCommentsFile>(json, StorageJsonOptions);
			return stored ?? new StoredCommentsFile();
		}

		private static async Task<StoredSuggestionsFile> ReadStoredSuggestionsAsync(string path)
		{
			if (!File.Exists(path))
			{
				return new StoredSuggestionsFile();
			}

			var json = await File.ReadAllTextAsync(path);
			var stored = JsonSerializer.Deserialize<StoredSuggestionsFile>(json, StorageJsonOptions);
			return stored ?? new StoredSuggestionsFile();
		}

		private static Task WriteStoredDocumentAsync(string path, StoredDocumentFile stored)
		{
			var json = JsonSerializer.Serialize(stored, StorageJsonOptions);
			return File.WriteAllTextAsync(path, json);
		}

		private static Task WriteStoredRevisionAsync(string documentDirectory, StoredRevisionFile revision)
		{
			var revisionDirectory = GetRevisionDirectory(documentDirectory);
			Directory.CreateDirectory(revisionDirectory);
			var revisionPath = Path.Combine(revisionDirectory, revision.RevisionId + ".json");
			var json = JsonSerializer.Serialize(revision, StorageJsonOptions);
			return File.WriteAllTextAsync(revisionPath, json);
		}

		private static Task WriteStoredCommentsAsync(string path, StoredCommentsFile comments)
		{
			var json = JsonSerializer.Serialize(comments ?? new StoredCommentsFile(), StorageJsonOptions);
			return File.WriteAllTextAsync(path, json);
		}

		private static Task WriteStoredSuggestionsAsync(string path, StoredSuggestionsFile suggestions)
		{
			var json = JsonSerializer.Serialize(suggestions ?? new StoredSuggestionsFile(), StorageJsonOptions);
			return File.WriteAllTextAsync(path, json);
		}

		private static string GetRevisionDirectory(string documentDirectory)
		{
			return Path.Combine(documentDirectory, "revisions");
		}

		private static string GetCommentsFilePath(string documentDirectory)
		{
			return Path.Combine(documentDirectory, CommentsFileName);
		}

		private static string GetSuggestionsFilePath(string documentDirectory)
		{
			return Path.Combine(documentDirectory, SuggestionsFileName);
		}

		private string GetDocumentDirectory(string id)
		{
			return Path.Combine(_rootPath, id);
		}

		private string GetDocumentDirectoryOrNull(string id)
		{
			if (string.IsNullOrWhiteSpace(id))
			{
				return null;
			}

			var trimmed = id.Trim();
			if (!ValidIdPattern.IsMatch(trimmed))
			{
				return null;
			}

			return GetDocumentDirectory(trimmed);
		}

		private static string GetDocumentFilePath(string documentDirectory)
		{
			return Path.Combine(documentDirectory, DocumentFileName);
		}

		private class StoredDocumentFile
		{
			public string Id { get; set; }
			public string Title { get; set; }
			public int Revision { get; set; }
			public string CurrentRevisionId { get; set; }
			public DateTime CreatedUtc { get; set; }
			public DateTime UpdatedUtc { get; set; }
			public string DocumentJson { get; set; }
		}

		private class StoredRevisionFile
		{
			public string RevisionId { get; set; }
			public int Revision { get; set; }
			public DateTime SavedUtc { get; set; }
			public string Title { get; set; }
			public string DocumentJson { get; set; }
		}

		private class StoredCommentsFile
		{
			public List<StoredCommentThreadFile> Threads { get; set; } = new List<StoredCommentThreadFile>();
		}

		private class StoredSuggestionsFile
		{
			public List<StoredSuggestionFile> Suggestions { get; set; } = new List<StoredSuggestionFile>();
		}

		private class StoredCommentThreadFile
		{
			public string ThreadId { get; set; }
			public string Status { get; set; }
			public string LinkedSuggestionId { get; set; }
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
			public DateTime CreatedUtc { get; set; }
			public DateTime UpdatedUtc { get; set; }
			public string CreatedBy { get; set; }
			public DateTime? ResolvedUtc { get; set; }
			public string ResolvedBy { get; set; }
			public List<StoredCommentEntryFile> Comments { get; set; } = new List<StoredCommentEntryFile>();
		}

		private class StoredCommentEntryFile
		{
			public string CommentId { get; set; }
			public string Body { get; set; }
			public string Author { get; set; }
			public string AuthorSessionId { get; set; }
			public DateTime CreatedUtc { get; set; }
		}

		private class StoredSuggestionFile
		{
			public string SuggestionId { get; set; }
			public string Type { get; set; }
			public string Status { get; set; }
			public string Body { get; set; }
			public string SuggestedText { get; set; }
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
			public DateTime CreatedUtc { get; set; }
			public DateTime UpdatedUtc { get; set; }
			public string CreatedBy { get; set; }
			public DateTime? DecidedUtc { get; set; }
			public string DecidedBy { get; set; }
		}
	}
}
