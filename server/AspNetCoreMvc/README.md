# AspNetCoreMvc Release Notes

This demo is now aligned to `.NET 8.0` and includes the current `v2.3` review stack:

- structured JSON document CRUD with revisions
- live collaboration room events over WebSockets
- threaded comments with durable anchors
- linked comment threads from review suggestions
- suggestion accept/reject flows and revision compare UI

## Release Checklist

1. Build the demo:

```powershell
dotnet build .\AspNetCoreMvc.csproj
```

2. Run the automated smoke test:

```powershell
.\scripts\release-smoke.ps1
```

If the app is already running from a previous build:

```powershell
.\scripts\release-smoke.ps1 -UseExistingServer -SkipBuild
```

3. Run the browser-level UI smoke check:

```powershell
npm install
npx playwright install chromium
npm run smoke:ui
```

If the app is already running from a previous build:

```powershell
$env:UI_SMOKE_USE_EXISTING_SERVER = '1'
$env:UI_SMOKE_BASE_URL = 'http://127.0.0.1:5070'
npm run smoke:ui
```

4. Open the review workspace manually for a quick UI pass:

```powershell
dotnet run --urls http://127.0.0.1:5070
```

Then visit:

- `http://127.0.0.1:5070/Home/Documents`

## What The Smoke Test Covers

- document create and update
- revision listing and revision detail fetch
- suggestion create and accept
- linked comment thread create and reply
- rejection of comment threads that point at a missing suggestion id
- comment list round-trip with `linkedSuggestionId`
- browser-level document create, suggestion comment-linking, overlays, save, and revision compare

## Demo Scope

This is release-ready as a demo/reference workspace, not as a multi-tenant production service.

Current known scope limits:

- persistence is file-backed under `App_Data/documents`
- collaboration is live save-sync and presence, not OT/CRDT simultaneous typing merge
- there is no auth or permission model yet
