using AspNetCoreMvc.Models;
using AspNetCoreMvc.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace AspNetCoreMvc.Controllers
{
	[ApiController]
	[Route("api/documents")]
	public class DocumentApiController : ControllerBase
	{
		private readonly FileDocumentStore _documentStore;
		private readonly DocumentCollaborationBroker _collaborationBroker;
		private readonly AiSuggestionService _aiSuggestionService;

		public DocumentApiController(
			FileDocumentStore documentStore,
			DocumentCollaborationBroker collaborationBroker,
			AiSuggestionService aiSuggestionService)
		{
			_documentStore = documentStore;
			_collaborationBroker = collaborationBroker;
			_aiSuggestionService = aiSuggestionService;
		}

		[HttpGet]
		public async Task<ActionResult<IReadOnlyList<DocumentSummary>>> ListDocuments()
		{
			return Ok(await _documentStore.ListAsync());
		}

		[HttpGet("{id}")]
		public async Task<ActionResult<DocumentResponse>> GetDocument(string id)
		{
			var document = await _documentStore.GetAsync(id);
			if (document == null)
			{
				return NotFound(new { message = "Document not found." });
			}

			return Ok(document);
		}

		[HttpPost]
		public async Task<ActionResult<DocumentResponse>> CreateDocument([FromBody] DocumentUpsertRequest request)
		{
			var validationResult = ValidateRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			var created = await _documentStore.CreateAsync(request);
			return CreatedAtAction(nameof(GetDocument), new { id = created.Id }, created);
		}

		[HttpPut("{id}")]
		public async Task<ActionResult<DocumentResponse>> UpdateDocument(string id, [FromBody] DocumentUpsertRequest request)
		{
			var validationResult = ValidateRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			var updateResult = await _documentStore.UpdateAsync(id, request);
			if (updateResult.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			if (updateResult.Conflict)
			{
				return Conflict(new DocumentConflictResponse
				{
					Message = "This document has changed since your last load. Reload the latest revision or force save to overwrite it.",
					ExpectedRevision = updateResult.ExpectedRevision,
					ActualRevision = updateResult.ActualRevision,
					CurrentDocument = updateResult.Document
				});
			}

			var updated = updateResult.Document;
			await _collaborationBroker.NotifyDocumentSavedAsync(updated, request.ClientSessionId, request.ClientDisplayName);
			return Ok(updated);
		}

		[HttpGet("{id}/revisions")]
		public async Task<ActionResult<IReadOnlyList<DocumentRevisionSummary>>> ListRevisions(string id)
		{
			if (!await _documentStore.ExistsAsync(id))
			{
				return NotFound(new { message = "Document not found." });
			}

			return Ok(await _documentStore.ListRevisionsAsync(id));
		}

		[HttpGet("{id}/revisions/{revisionId}")]
		public async Task<ActionResult<DocumentRevisionResponse>> GetRevision(string id, string revisionId)
		{
			if (!await _documentStore.ExistsAsync(id))
			{
				return NotFound(new { message = "Document not found." });
			}

			var revision = await _documentStore.GetRevisionAsync(id, revisionId);
			if (revision == null)
			{
				return NotFound(new { message = "Revision not found." });
			}

			return Ok(revision);
		}

		[HttpGet("{id}/comments")]
		public async Task<ActionResult<IReadOnlyList<CommentThreadResponse>>> ListComments(string id)
		{
			if (!await _documentStore.ExistsAsync(id))
			{
				return NotFound(new { message = "Document not found." });
			}

			return Ok(await _documentStore.ListCommentsAsync(id));
		}

		[HttpPost("{id}/comments")]
		public async Task<ActionResult<CommentThreadResponse>> CreateCommentThread(string id, [FromBody] CommentThreadCreateRequest request)
		{
			var validationResult = ValidateCommentThreadRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			if (!string.IsNullOrWhiteSpace(request.LinkedSuggestionId) &&
				!await _documentStore.SuggestionExistsAsync(id, request.LinkedSuggestionId))
			{
				return BadRequest(new { message = "Linked suggestion not found for this document." });
			}

			var result = await _documentStore.CreateCommentThreadAsync(id, request);
			if (result.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			await _collaborationBroker.NotifyCommentThreadCreatedAsync(id, result.Thread, request.ClientSessionId, request.ClientDisplayName);
			return Ok(result.Thread);
		}

		[HttpPost("{id}/comments/{threadId}/replies")]
		public async Task<ActionResult<CommentThreadResponse>> CreateCommentReply(string id, string threadId, [FromBody] CommentReplyCreateRequest request)
		{
			var validationResult = ValidateCommentReplyRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			var result = await _documentStore.AddCommentReplyAsync(id, threadId, request);
			if (result.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			if (result.ThreadNotFound)
			{
				return NotFound(new { message = "Comment thread not found." });
			}

			await _collaborationBroker.NotifyCommentThreadUpdatedAsync(id, result.Thread, request.ClientSessionId, request.ClientDisplayName);
			return Ok(result.Thread);
		}

		[HttpPost("{id}/comments/{threadId}/status")]
		public async Task<ActionResult<CommentThreadResponse>> UpdateCommentThreadStatus(string id, string threadId, [FromBody] CommentThreadStatusUpdateRequest request)
		{
			var validationResult = ValidateCommentThreadStatusRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			var result = await _documentStore.UpdateCommentThreadStatusAsync(id, threadId, request);
			if (result.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			if (result.ThreadNotFound)
			{
				return NotFound(new { message = "Comment thread not found." });
			}

			await _collaborationBroker.NotifyCommentThreadUpdatedAsync(id, result.Thread, request.ClientSessionId, request.ClientDisplayName);
			return Ok(result.Thread);
		}

		[HttpGet("{id}/suggestions")]
		public async Task<ActionResult<IReadOnlyList<SuggestionResponse>>> ListSuggestions(string id)
		{
			if (!await _documentStore.ExistsAsync(id))
			{
				return NotFound(new { message = "Document not found." });
			}

			return Ok(await _documentStore.ListSuggestionsAsync(id));
		}

		[HttpPost("{id}/suggestions")]
		public async Task<ActionResult<SuggestionResponse>> CreateSuggestion(string id, [FromBody] SuggestionCreateRequest request)
		{
			var validationResult = ValidateSuggestionCreateRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			var result = await _documentStore.CreateSuggestionAsync(id, request);
			if (result.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			await _collaborationBroker.NotifySuggestionCreatedAsync(id, result.Suggestion, request.ClientSessionId, request.ClientDisplayName);
			return Ok(result.Suggestion);
		}

		[HttpPost("{id}/ai/suggestions")]
		public async Task<ActionResult<AiSuggestionRunResponse>> CreateAiSuggestion(string id, [FromBody] AiSuggestionRunRequest request)
		{
			var validationResult = ValidateAiSuggestionRunRequest(request);
			if (validationResult != null)
			{
				return validationResult;
			}

			if (!await _documentStore.ExistsAsync(id))
			{
				return NotFound(new { message = "Document not found." });
			}

			try
			{
				var generated = await _aiSuggestionService.GenerateAsync(request);
				var createResult = await _documentStore.CreateSuggestionAsync(id, new SuggestionCreateRequest
				{
					Type = generated.SuggestionType,
					Body = generated.Body,
					SuggestedText = generated.SuggestedText,
					AnchorText = request.AnchorText,
					AnchorRevision = request.AnchorRevision,
					AnchorStartOffset = request.AnchorStartOffset,
					AnchorEndOffset = request.AnchorEndOffset,
					AnchorStartTextNodePath = request.AnchorStartTextNodePath,
					AnchorStartTextNodeOffset = request.AnchorStartTextNodeOffset,
					AnchorEndTextNodePath = request.AnchorEndTextNodePath,
					AnchorEndTextNodeOffset = request.AnchorEndTextNodeOffset,
					AnchorTextNodePath = request.AnchorTextNodePath,
					AnchorTextNodeStartOffset = request.AnchorTextNodeStartOffset,
					AnchorTextNodeEndOffset = request.AnchorTextNodeEndOffset,
					AnchorBlockPath = request.AnchorBlockPath,
					AnchorBlockType = request.AnchorBlockType,
					AnchorBlockStartOffset = request.AnchorBlockStartOffset,
					AnchorBlockEndOffset = request.AnchorBlockEndOffset,
					AnchorContextBefore = request.AnchorContextBefore,
					AnchorContextAfter = request.AnchorContextAfter,
					ClientSessionId = request.ClientSessionId,
					ClientDisplayName = request.ClientDisplayName
				});

				await _collaborationBroker.NotifySuggestionCreatedAsync(id, createResult.Suggestion, request.ClientSessionId, request.ClientDisplayName);

				return Ok(new AiSuggestionRunResponse
				{
					Action = generated.Action,
					Mode = generated.Mode,
					Provider = generated.Provider,
					Message = generated.Message,
					Suggestion = createResult.Suggestion
				});
			}
			catch (System.InvalidOperationException error)
			{
				return BadRequest(new { message = error.Message });
			}
		}

		[HttpPost("{id}/suggestions/{suggestionId}/accept")]
		public async Task<ActionResult<SuggestionResponse>> AcceptSuggestion(string id, string suggestionId, [FromBody] SuggestionDecisionRequest request)
		{
			request ??= new SuggestionDecisionRequest();

			var result = await _documentStore.AcceptSuggestionAsync(id, suggestionId, request);
			if (result.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			if (result.SuggestionNotFound)
			{
				return NotFound(new { message = "Suggestion not found." });
			}

			await _collaborationBroker.NotifySuggestionUpdatedAsync(id, result.Suggestion, request.ClientSessionId, request.ClientDisplayName);
			return Ok(result.Suggestion);
		}

		[HttpPost("{id}/suggestions/{suggestionId}/reject")]
		public async Task<ActionResult<SuggestionResponse>> RejectSuggestion(string id, string suggestionId, [FromBody] SuggestionDecisionRequest request)
		{
			request ??= new SuggestionDecisionRequest();

			var result = await _documentStore.RejectSuggestionAsync(id, suggestionId, request);
			if (result.NotFound)
			{
				return NotFound(new { message = "Document not found." });
			}

			if (result.SuggestionNotFound)
			{
				return NotFound(new { message = "Suggestion not found." });
			}

			await _collaborationBroker.NotifySuggestionUpdatedAsync(id, result.Suggestion, request.ClientSessionId, request.ClientDisplayName);
			return Ok(result.Suggestion);
		}

		private ActionResult ValidateRequest(DocumentUpsertRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			if (request.Document.ValueKind != JsonValueKind.Object)
			{
				return BadRequest(new { message = "The document payload must be a JSON object." });
			}

			if (!request.Document.TryGetProperty("type", out var typeProperty) || typeProperty.GetString() != "doc")
			{
				return BadRequest(new { message = "The document payload must use the structured content root type 'doc'." });
			}

			if (!request.Document.TryGetProperty("content", out var contentProperty) || contentProperty.ValueKind != JsonValueKind.Array)
			{
				return BadRequest(new { message = "The document payload must include a content array." });
			}

			return null;
		}

		private ActionResult ValidateCommentThreadRequest(CommentThreadCreateRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			if (string.IsNullOrWhiteSpace(request.Body))
			{
				return BadRequest(new { message = "A comment body is required." });
			}

			if (string.IsNullOrWhiteSpace(request.AnchorText))
			{
				return BadRequest(new { message = "An anchor text selection is required." });
			}

			return ValidateAnchorFields(
				request.AnchorStartOffset,
				request.AnchorEndOffset,
				request.AnchorStartTextNodePath,
				request.AnchorStartTextNodeOffset,
				request.AnchorEndTextNodePath,
				request.AnchorEndTextNodeOffset,
				request.AnchorTextNodePath,
				request.AnchorTextNodeStartOffset,
				request.AnchorTextNodeEndOffset,
				request.AnchorBlockPath,
				request.AnchorBlockStartOffset,
				request.AnchorBlockEndOffset);
		}

		private ActionResult ValidateSuggestionCreateRequest(SuggestionCreateRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			if (!IsValidSuggestionType(request.Type))
			{
				return BadRequest(new { message = "Suggestion type must be one of 'insert', 'delete', or 'format'." });
			}

			if (string.IsNullOrWhiteSpace(request.Body) &&
				string.IsNullOrWhiteSpace(request.SuggestedText) &&
				string.IsNullOrWhiteSpace(request.AnchorText))
			{
				return BadRequest(new { message = "Suggestions must include anchor text, suggested text, or a review note." });
			}

			return ValidateAnchorFields(
				request.AnchorStartOffset,
				request.AnchorEndOffset,
				request.AnchorStartTextNodePath,
				request.AnchorStartTextNodeOffset,
				request.AnchorEndTextNodePath,
				request.AnchorEndTextNodeOffset,
				request.AnchorTextNodePath,
				request.AnchorTextNodeStartOffset,
				request.AnchorTextNodeEndOffset,
				request.AnchorBlockPath,
				request.AnchorBlockStartOffset,
				request.AnchorBlockEndOffset);
		}

		private ActionResult ValidateAiSuggestionRunRequest(AiSuggestionRunRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			if (!IsValidAiAction(request.Action))
			{
				return BadRequest(new { message = "AI action must be one of 'proofread', 'rewrite', 'shorten', 'expand', or 'summarize'." });
			}

			if (string.IsNullOrWhiteSpace(request.AnchorText))
			{
				return BadRequest(new { message = "Capture a text selection before running AI." });
			}

			if (request.Document.ValueKind != JsonValueKind.Object)
			{
				return BadRequest(new { message = "The current document payload must be included when running AI." });
			}

			return ValidateAnchorFields(
				request.AnchorStartOffset,
				request.AnchorEndOffset,
				request.AnchorStartTextNodePath,
				request.AnchorStartTextNodeOffset,
				request.AnchorEndTextNodePath,
				request.AnchorEndTextNodeOffset,
				request.AnchorTextNodePath,
				request.AnchorTextNodeStartOffset,
				request.AnchorTextNodeEndOffset,
				request.AnchorBlockPath,
				request.AnchorBlockStartOffset,
				request.AnchorBlockEndOffset);
		}

		private ActionResult ValidateCommentReplyRequest(CommentReplyCreateRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			if (string.IsNullOrWhiteSpace(request.Body))
			{
				return BadRequest(new { message = "A reply body is required." });
			}

			return null;
		}

		private ActionResult ValidateCommentThreadStatusRequest(CommentThreadStatusUpdateRequest request)
		{
			if (request == null)
			{
				return BadRequest(new { message = "Request body is required." });
			}

			if (!string.Equals(request.Status, "open", System.StringComparison.OrdinalIgnoreCase) &&
				!string.Equals(request.Status, "resolved", System.StringComparison.OrdinalIgnoreCase))
			{
				return BadRequest(new { message = "Comment thread status must be either 'open' or 'resolved'." });
			}

			return null;
		}

		private ActionResult ValidateAnchorFields(
			int? anchorStartOffset,
			int? anchorEndOffset,
			int[] anchorStartTextNodePath,
			int? anchorStartTextNodeOffset,
			int[] anchorEndTextNodePath,
			int? anchorEndTextNodeOffset,
			int[] anchorTextNodePath,
			int? anchorTextNodeStartOffset,
			int? anchorTextNodeEndOffset,
			int[] anchorBlockPath,
			int? anchorBlockStartOffset,
			int? anchorBlockEndOffset)
		{
			if (anchorStartOffset.HasValue && anchorStartOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor start offsets must be zero or greater." });
			}

			if (anchorEndOffset.HasValue && anchorEndOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor end offsets must be zero or greater." });
			}

			if (anchorStartOffset.HasValue && anchorEndOffset.HasValue && anchorEndOffset.Value < anchorStartOffset.Value)
			{
				return BadRequest(new { message = "Anchor end offsets must be greater than or equal to the anchor start offset." });
			}

			if (!IsValidAnchorPath(anchorStartTextNodePath))
			{
				return BadRequest(new { message = "Anchor start text node paths must contain only zero-or-greater integers." });
			}

			if (anchorStartTextNodeOffset.HasValue && anchorStartTextNodeOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor start text node offsets must be zero or greater." });
			}

			if (!IsValidAnchorPath(anchorEndTextNodePath))
			{
				return BadRequest(new { message = "Anchor end text node paths must contain only zero-or-greater integers." });
			}

			if (anchorEndTextNodeOffset.HasValue && anchorEndTextNodeOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor end text node offsets must be zero or greater." });
			}

			if (HasEqualAnchorPaths(anchorStartTextNodePath, anchorEndTextNodePath) &&
				anchorStartTextNodeOffset.HasValue &&
				anchorEndTextNodeOffset.HasValue &&
				anchorEndTextNodeOffset.Value < anchorStartTextNodeOffset.Value)
			{
				return BadRequest(new { message = "Anchor end text node offsets must be greater than or equal to the anchor start text node offset when both paths are the same." });
			}

			if (!IsValidAnchorPath(anchorTextNodePath))
			{
				return BadRequest(new { message = "Anchor text node paths must contain only zero-or-greater integers." });
			}

			if (anchorTextNodeStartOffset.HasValue && anchorTextNodeStartOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor text node start offsets must be zero or greater." });
			}

			if (anchorTextNodeEndOffset.HasValue && anchorTextNodeEndOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor text node end offsets must be zero or greater." });
			}

			if (anchorTextNodeStartOffset.HasValue && anchorTextNodeEndOffset.HasValue && anchorTextNodeEndOffset.Value < anchorTextNodeStartOffset.Value)
			{
				return BadRequest(new { message = "Anchor text node end offsets must be greater than or equal to the anchor text node start offset." });
			}

			if (!IsValidAnchorPath(anchorBlockPath))
			{
				return BadRequest(new { message = "Anchor block paths must contain only zero-or-greater integers." });
			}

			if (anchorBlockStartOffset.HasValue && anchorBlockStartOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor block start offsets must be zero or greater." });
			}

			if (anchorBlockEndOffset.HasValue && anchorBlockEndOffset.Value < 0)
			{
				return BadRequest(new { message = "Anchor block end offsets must be zero or greater." });
			}

			if (anchorBlockStartOffset.HasValue && anchorBlockEndOffset.HasValue && anchorBlockEndOffset.Value < anchorBlockStartOffset.Value)
			{
				return BadRequest(new { message = "Anchor block end offsets must be greater than or equal to the anchor block start offset." });
			}

			return null;
		}

		private static bool IsValidAnchorPath(int[] path)
		{
			if (path == null || path.Length == 0)
			{
				return true;
			}

			for (var index = 0; index < path.Length; index++)
			{
				if (path[index] < 0)
				{
					return false;
				}
			}

			return true;
		}

		private static bool HasEqualAnchorPaths(int[] left, int[] right)
		{
			if (left == null || right == null || left.Length != right.Length)
			{
				return false;
			}

			for (var index = 0; index < left.Length; index++)
			{
				if (left[index] != right[index])
				{
					return false;
				}
			}

			return left.Length > 0;
		}

		private static bool IsValidSuggestionType(string value)
		{
			return string.Equals(value, "insert", System.StringComparison.OrdinalIgnoreCase) ||
				string.Equals(value, "delete", System.StringComparison.OrdinalIgnoreCase) ||
				string.Equals(value, "format", System.StringComparison.OrdinalIgnoreCase);
		}

		private static bool IsValidAiAction(string value)
		{
			return string.Equals(value, "proofread", System.StringComparison.OrdinalIgnoreCase) ||
				string.Equals(value, "rewrite", System.StringComparison.OrdinalIgnoreCase) ||
				string.Equals(value, "shorten", System.StringComparison.OrdinalIgnoreCase) ||
				string.Equals(value, "expand", System.StringComparison.OrdinalIgnoreCase) ||
				string.Equals(value, "summarize", System.StringComparison.OrdinalIgnoreCase);
		}
	}
}
