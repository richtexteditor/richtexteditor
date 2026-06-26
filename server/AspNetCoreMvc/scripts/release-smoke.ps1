param(
	[string]$BaseUrl = "http://127.0.0.1:5070",
	[switch]$UseExistingServer,
	[switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$projectFile = Join-Path $projectRoot "AspNetCoreMvc.csproj"
$baseUrl = $BaseUrl.TrimEnd("/")
$serverProcess = $null
$stdoutLog = Join-Path $projectRoot "release-smoke.out.log"
$stderrLog = Join-Path $projectRoot "release-smoke.err.log"

function Wait-ForServer {
	param(
		[string]$Url
	)

	for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
		try {
			$null = Invoke-WebRequest -Uri ($Url + "/api/documents") -UseBasicParsing -TimeoutSec 3
			return
		}
		catch {
			Start-Sleep -Milliseconds 500
		}
	}

	throw "Timed out waiting for $Url."
}

function Invoke-Json {
	param(
		[string]$Method,
		[string]$Uri,
		[object]$Body = $null
	)

	if ($null -eq $Body) {
		return Invoke-RestMethod -Uri $Uri -Method $Method -ContentType "application/json"
	}

	return Invoke-RestMethod -Uri $Uri -Method $Method -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 30)
}

if (-not $UseExistingServer) {
	if (-not $SkipBuild) {
		dotnet build $projectFile
		if ($LASTEXITCODE -ne 0) {
			throw "dotnet build failed."
		}
	}

	$serverProcess = Start-Process dotnet `
		-ArgumentList @("run", "--no-build", "--urls", $baseUrl) `
		-WorkingDirectory $projectRoot `
		-PassThru `
		-RedirectStandardOutput $stdoutLog `
		-RedirectStandardError $stderrLog

	Wait-ForServer -Url $baseUrl
}

try {
	$initialDocument = @{
		title = "Release smoke document"
		clientSessionId = "release-smoke"
		clientDisplayName = "Release Smoke"
		document = @{
			type = "doc"
			version = 2
			format = "richtexteditor-json"
			content = @(
				@{
					type = "paragraph"
					content = @(
						@{
							type = "text"
							text = "Review this linked suggestion example before release."
						}
					)
				}
			)
		}
	}

	$created = Invoke-Json -Method "Post" -Uri ($baseUrl + "/api/documents") -Body $initialDocument
	if (-not $created.id) {
		throw "Document creation did not return an id."
	}

	$updatedDocument = @{
		title = $created.title
		clientSessionId = "release-smoke"
		clientDisplayName = "Release Smoke"
		expectedRevision = $created.revision
		document = @{
			type = "doc"
			version = 2
			format = "richtexteditor-json"
			content = @(
				@{
					type = "paragraph"
					content = @(
						@{
							type = "text"
							text = "Review this linked suggestion example before release."
						}
					)
				},
				@{
					type = "paragraph"
					content = @(
						@{
							type = "text"
							text = "Revision compare should have at least one saved revision to inspect."
						}
					)
				}
			)
		}
	}

	$updated = Invoke-Json -Method "Put" -Uri ($baseUrl + "/api/documents/" + $created.id) -Body $updatedDocument
	if ($updated.revision -le $created.revision) {
		throw "Document update did not advance the revision."
	}

	$revisions = Invoke-Json -Method "Get" -Uri ($baseUrl + "/api/documents/" + $created.id + "/revisions")
	if (-not $revisions -or $revisions.Count -lt 1) {
		throw "Revision listing did not return any saved revisions."
	}

	$revisionDetail = Invoke-Json -Method "Get" -Uri ($baseUrl + "/api/documents/" + $created.id + "/revisions/" + $revisions[0].revisionId)
	if (-not $revisionDetail.document) {
		throw "Revision detail did not include a document payload."
	}

	$suggestionRequest = @{
		type = "format"
		body = "Tighten the wording before the release cut."
		suggestedText = "Review this linked comment example before release."
		anchorText = "linked suggestion example"
		anchorRevision = $updated.revision
		clientSessionId = "release-smoke"
		clientDisplayName = "Release Smoke"
	}

	$suggestion = Invoke-Json -Method "Post" -Uri ($baseUrl + "/api/documents/" + $created.id + "/suggestions") -Body $suggestionRequest
	if (-not $suggestion.suggestionId) {
		throw "Suggestion creation did not return an id."
	}

	$commentRequest = @{
		body = "This thread should stay attached to the suggestion."
		linkedSuggestionId = $suggestion.suggestionId
		anchorText = "linked suggestion example"
		anchorRevision = $updated.revision
		clientSessionId = "release-smoke"
		clientDisplayName = "Release Smoke"
	}

	$thread = Invoke-Json -Method "Post" -Uri ($baseUrl + "/api/documents/" + $created.id + "/comments") -Body $commentRequest
	if ($thread.linkedSuggestionId -ne $suggestion.suggestionId) {
		throw "Comment thread did not retain the linked suggestion id."
	}

	$invalidLinkRejected = $false
	try {
		$invalidCommentRequest = @{
			body = "This should be rejected."
			linkedSuggestionId = "suggestion_missing_release_smoke"
			anchorText = "linked suggestion example"
			anchorRevision = $updated.revision
			clientSessionId = "release-smoke"
			clientDisplayName = "Release Smoke"
		}

		$null = Invoke-Json -Method "Post" -Uri ($baseUrl + "/api/documents/" + $created.id + "/comments") -Body $invalidCommentRequest
	}
	catch {
		$statusCode = $null
		if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
			$statusCode = [int]$_.Exception.Response.StatusCode
		}

		if ($statusCode -eq 400) {
			$invalidLinkRejected = $true
		}
		else {
			throw
		}
	}

	if (-not $invalidLinkRejected) {
		throw "Linked suggestion validation did not reject an invalid suggestion id."
	}

	$replyRequest = @{
		body = "Reply path is working."
		clientSessionId = "release-smoke"
		clientDisplayName = "Release Smoke"
	}

	$threadAfterReply = Invoke-Json -Method "Post" -Uri ($baseUrl + "/api/documents/" + $created.id + "/comments/" + $thread.threadId + "/replies") -Body $replyRequest
	if (($threadAfterReply.comments | Measure-Object).Count -lt 2) {
		throw "Comment reply did not persist."
	}

	$acceptRequest = @{
		clientSessionId = "release-smoke"
		clientDisplayName = "Release Smoke"
	}

	$acceptedSuggestion = Invoke-Json -Method "Post" -Uri ($baseUrl + "/api/documents/" + $created.id + "/suggestions/" + $suggestion.suggestionId + "/accept") -Body $acceptRequest
	if ($acceptedSuggestion.status -ne "accepted") {
		throw "Suggestion accept flow did not persist."
	}

	$comments = Invoke-Json -Method "Get" -Uri ($baseUrl + "/api/documents/" + $created.id + "/comments")
	if (($comments | Where-Object { $_.linkedSuggestionId -eq $suggestion.suggestionId } | Measure-Object).Count -ne 1) {
		throw "Linked suggestion thread did not round-trip through the comments list."
	}

	Write-Host ("Release smoke passed for document {0}, suggestion {1}, thread {2}, revision {3}." -f $created.id, $suggestion.suggestionId, $thread.threadId, $updated.revision)
}
finally {
	if ($serverProcess -and -not $serverProcess.HasExited) {
		Stop-Process -Id $serverProcess.Id -Force
	}
}
