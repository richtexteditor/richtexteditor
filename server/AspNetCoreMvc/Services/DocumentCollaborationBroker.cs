using AspNetCoreMvc.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace AspNetCoreMvc.Services
{
	public class DocumentCollaborationBroker
	{
		private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.CamelCase
		};

		private readonly ConcurrentDictionary<string, DocumentRoom> _rooms = new ConcurrentDictionary<string, DocumentRoom>();

		public async Task HandleConnectionAsync(
			string documentId,
			string clientSessionId,
			string clientDisplayName,
			WebSocket socket,
			CancellationToken cancellationToken)
		{
			var normalizedDocumentId = NormalizeValue(documentId, "unknown-document");
			var normalizedSessionId = NormalizeValue(clientSessionId, Guid.NewGuid().ToString("N"));
			var normalizedDisplayName = NormalizeValue(clientDisplayName, "Editor " + normalizedSessionId.Substring(0, 6));
			var room = _rooms.GetOrAdd(normalizedDocumentId, _ => new DocumentRoom());
			var connection = new CollaborationConnection(normalizedSessionId, normalizedDisplayName, socket);

			if (room.Connections.TryGetValue(normalizedSessionId, out var previousConnection))
			{
				room.Connections.TryRemove(normalizedSessionId, out _);
				await CloseSocketQuietlyAsync(previousConnection.Socket);
			}

			room.Connections[normalizedSessionId] = connection;
			await BroadcastPresenceAsync(normalizedDocumentId);

			var buffer = new byte[256];
			try
			{
				while (!cancellationToken.IsCancellationRequested && socket.State == WebSocketState.Open)
				{
					var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
					if (result.MessageType == WebSocketMessageType.Close || result.CloseStatus.HasValue)
					{
						break;
					}
				}
			}
			catch (OperationCanceledException)
			{
			}
			catch (WebSocketException)
			{
			}
			finally
			{
				room.Connections.TryRemove(normalizedSessionId, out _);
				await CloseSocketQuietlyAsync(socket);
				await BroadcastPresenceAsync(normalizedDocumentId);
				if (room.Connections.IsEmpty)
				{
					_rooms.TryRemove(normalizedDocumentId, out _);
				}
			}
		}

		public Task NotifyDocumentSavedAsync(DocumentResponse document, string sourceSessionId, string sourceDisplayName)
		{
			if (document == null || string.IsNullOrWhiteSpace(document.Id))
			{
				return Task.CompletedTask;
			}

			var payload = new
			{
				type = "documentSaved",
				documentId = document.Id,
				sourceSessionId = NormalizeValue(sourceSessionId, string.Empty),
				savedBy = ResolveDisplayName(document.Id, sourceSessionId, sourceDisplayName),
				document
			};

			return BroadcastAsync(document.Id, payload);
		}

		public Task NotifyCommentThreadCreatedAsync(string documentId, CommentThreadResponse thread, string sourceSessionId, string sourceDisplayName)
		{
			return BroadcastCommentThreadAsync("commentThreadCreated", documentId, thread, sourceSessionId, sourceDisplayName);
		}

		public Task NotifyCommentThreadUpdatedAsync(string documentId, CommentThreadResponse thread, string sourceSessionId, string sourceDisplayName)
		{
			return BroadcastCommentThreadAsync("commentThreadUpdated", documentId, thread, sourceSessionId, sourceDisplayName);
		}

		public Task NotifySuggestionCreatedAsync(string documentId, SuggestionResponse suggestion, string sourceSessionId, string sourceDisplayName)
		{
			return BroadcastSuggestionAsync("suggestionCreated", documentId, suggestion, sourceSessionId, sourceDisplayName);
		}

		public Task NotifySuggestionUpdatedAsync(string documentId, SuggestionResponse suggestion, string sourceSessionId, string sourceDisplayName)
		{
			return BroadcastSuggestionAsync("suggestionUpdated", documentId, suggestion, sourceSessionId, sourceDisplayName);
		}

		private async Task BroadcastPresenceAsync(string documentId)
		{
			if (!_rooms.TryGetValue(documentId, out var room))
			{
				return;
			}

			var participants = room.Connections.Values
				.OrderBy(connection => connection.DisplayName, StringComparer.OrdinalIgnoreCase)
				.Select(connection => new
				{
					sessionId = connection.SessionId,
					displayName = connection.DisplayName
				})
				.ToList();

			await BroadcastAsync(documentId, new
			{
				type = "presence",
				documentId,
				count = participants.Count,
				participants
			});
		}

		private Task BroadcastCommentThreadAsync(string eventType, string documentId, CommentThreadResponse thread, string sourceSessionId, string sourceDisplayName)
		{
			if (thread == null || string.IsNullOrWhiteSpace(documentId))
			{
				return Task.CompletedTask;
			}

			var payload = new
			{
				type = eventType,
				documentId,
				sourceSessionId = NormalizeValue(sourceSessionId, string.Empty),
				changedBy = ResolveDisplayName(documentId, sourceSessionId, sourceDisplayName),
				thread
			};

			return BroadcastAsync(documentId, payload);
		}

		private Task BroadcastSuggestionAsync(string eventType, string documentId, SuggestionResponse suggestion, string sourceSessionId, string sourceDisplayName)
		{
			if (suggestion == null || string.IsNullOrWhiteSpace(documentId))
			{
				return Task.CompletedTask;
			}

			var payload = new
			{
				type = eventType,
				documentId,
				sourceSessionId = NormalizeValue(sourceSessionId, string.Empty),
				changedBy = ResolveDisplayName(documentId, sourceSessionId, sourceDisplayName),
				suggestion
			};

			return BroadcastAsync(documentId, payload);
		}

		private async Task BroadcastAsync(string documentId, object payload)
		{
			if (!_rooms.TryGetValue(documentId, out var room))
			{
				return;
			}

			var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload, JsonOptions));
			var connections = room.Connections.Values.ToList();

			foreach (var connection in connections)
			{
				await SendPayloadAsync(connection, bytes);
			}
		}

		private async Task SendPayloadAsync(CollaborationConnection connection, byte[] bytes)
		{
			if (connection.Socket.State != WebSocketState.Open)
			{
				return;
			}

			await connection.SendLock.WaitAsync();
			try
			{
				if (connection.Socket.State == WebSocketState.Open)
				{
					await connection.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
				}
			}
			catch (WebSocketException)
			{
			}
			finally
			{
				connection.SendLock.Release();
			}
		}

		private string ResolveDisplayName(string documentId, string sourceSessionId, string fallbackDisplayName)
		{
			if (_rooms.TryGetValue(documentId, out var room) &&
				!string.IsNullOrWhiteSpace(sourceSessionId) &&
				room.Connections.TryGetValue(sourceSessionId, out var connection))
			{
				return connection.DisplayName;
			}

			return NormalizeValue(fallbackDisplayName, "Another editor");
		}

		private static string NormalizeValue(string value, string fallback)
		{
			return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
		}

		private static async Task CloseSocketQuietlyAsync(WebSocket socket)
		{
			if (socket == null)
			{
				return;
			}

			try
			{
				if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
				{
					await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
				}
			}
			catch (WebSocketException)
			{
			}
		}

		private class DocumentRoom
		{
			public ConcurrentDictionary<string, CollaborationConnection> Connections { get; } = new ConcurrentDictionary<string, CollaborationConnection>();
		}

		private class CollaborationConnection
		{
			public CollaborationConnection(string sessionId, string displayName, WebSocket socket)
			{
				SessionId = sessionId;
				DisplayName = displayName;
				Socket = socket;
				SendLock = new SemaphoreSlim(1, 1);
			}

			public string SessionId { get; }
			public string DisplayName { get; }
			public WebSocket Socket { get; }
			public SemaphoreSlim SendLock { get; }
		}
	}
}
