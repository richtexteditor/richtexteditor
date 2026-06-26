using System;
using System.Text.Json;

namespace AspNetCoreMvc.Models
{
	public class DocumentUpsertRequest
	{
		public string Title { get; set; }
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
		public int? ExpectedRevision { get; set; }
		public bool ForceSave { get; set; }
		public JsonElement Document { get; set; }
	}

	public class DocumentResponse
	{
		public string Id { get; set; }
		public string Title { get; set; }
		public int Revision { get; set; }
		public string CurrentRevisionId { get; set; }
		public DateTime CreatedUtc { get; set; }
		public DateTime UpdatedUtc { get; set; }
		public JsonElement Document { get; set; }
	}

	public class DocumentSummary
	{
		public string Id { get; set; }
		public string Title { get; set; }
		public int Revision { get; set; }
		public string CurrentRevisionId { get; set; }
		public DateTime CreatedUtc { get; set; }
		public DateTime UpdatedUtc { get; set; }
	}

	public class DocumentRevisionSummary
	{
		public string RevisionId { get; set; }
		public int Revision { get; set; }
		public DateTime SavedUtc { get; set; }
		public string Title { get; set; }
	}

	public class DocumentRevisionResponse
	{
		public string DocumentId { get; set; }
		public string RevisionId { get; set; }
		public int Revision { get; set; }
		public DateTime SavedUtc { get; set; }
		public string Title { get; set; }
		public JsonElement Document { get; set; }
	}

	public class DocumentUpdateResult
	{
		public bool NotFound { get; set; }
		public bool Conflict { get; set; }
		public int? ExpectedRevision { get; set; }
		public int ActualRevision { get; set; }
		public DocumentResponse Document { get; set; }
	}

	public class DocumentConflictResponse
	{
		public string Message { get; set; }
		public int? ExpectedRevision { get; set; }
		public int ActualRevision { get; set; }
		public DocumentResponse CurrentDocument { get; set; }
	}

	public class CommentThreadCreateRequest
	{
		public string Body { get; set; }
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
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
	}

	public class CommentReplyCreateRequest
	{
		public string Body { get; set; }
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
	}

	public class CommentThreadStatusUpdateRequest
	{
		public string Status { get; set; }
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
	}

	public class CommentMessageResponse
	{
		public string CommentId { get; set; }
		public string Body { get; set; }
		public string Author { get; set; }
		public string AuthorSessionId { get; set; }
		public DateTime CreatedUtc { get; set; }
	}

	public class CommentThreadResponse
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
		public CommentMessageResponse[] Comments { get; set; }
	}

	public class CommentThreadMutationResult
	{
		public bool NotFound { get; set; }
		public bool ThreadNotFound { get; set; }
		public CommentThreadResponse Thread { get; set; }
	}

	public class SuggestionCreateRequest
	{
		public string Type { get; set; }
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
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
	}

	public class SuggestionDecisionRequest
	{
		public string ClientSessionId { get; set; }
		public string ClientDisplayName { get; set; }
	}

	public class SuggestionResponse
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

	public class SuggestionMutationResult
	{
		public bool NotFound { get; set; }
		public bool SuggestionNotFound { get; set; }
		public SuggestionResponse Suggestion { get; set; }
	}
}
