@echo off
REM Rebuild all_plugins.js, stripping any UTF-8 BOM from source files so
REM they concatenate into a single parseable script, then regenerate
REM all_plugins.min.js from it.
REM
REM Two things this script gets right that are easy to break:
REM
REM 1. all_plugins.min.js MUST be excluded from the concatenation. It lives in
REM    this folder and matches *.js, so without the exclusion the whole 690KB
REM    minified bundle gets inlined into all_plugins.js and every plugin ends
REM    up defined twice (the bundle balloons to ~2.2MB).
REM
REM 2. The minify step is part of THIS script on purpose. all_plugins.min.js
REM    used to be produced by hand, so it silently drifted behind
REM    all_plugins.js — shipping stale plugin code to anyone loading the
REM    minified bundle. If minification fails, this script fails loudly rather
REM    than leaving a stale .min.js in place.

del all_plugins.js 2>nul

powershell -NoProfile -Command ^
  "$files = Get-ChildItem -Filter '*.js' | Where-Object { $_.Name -notin @('all_plugins.js','all_plugins.min.js','crdt-engine.js','crdt-engine.min.js') };" ^
  "$sb = New-Object System.Text.StringBuilder;" ^
  "foreach ($f in $files) {" ^
  "  $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8);" ^
  "  if ($t.Length -gt 0 -and $t[0] -eq [char]0xFEFF) { $t = $t.Substring(1) }" ^
  "  [void]$sb.Append($t);" ^
  "  if (-not $t.EndsWith([Environment]::NewLine)) { [void]$sb.Append([Environment]::NewLine) }" ^
  "};" ^
  "$tail = [System.IO.File]::ReadAllText((Resolve-Path '-combine-plugin.txt'), [System.Text.Encoding]::UTF8);" ^
  "if ($tail.Length -gt 0 -and $tail[0] -eq [char]0xFEFF) { $tail = $tail.Substring(1) };" ^
  "[void]$sb.Append($tail);" ^
  "[System.IO.File]::WriteAllText('all_plugins.js', $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))"

if not exist all_plugins.js (
    echo.
    echo FAILED: all_plugins.js was not produced. Stopping before the stale
    echo         all_plugins.min.js can be shipped.
    pause
    exit /b 1
)

echo Minifying all_plugins.js -^> all_plugins.min.js ...
REM -m mangles local names only; top-level names are left alone, which is
REM required: the plugin globals (RTE_Plugin_*) are referenced by name from
REM rte-config.js / RTE_DefaultConfig.
call npx --yes terser all_plugins.js -o all_plugins.min.js --ecma 2020 -c -m --comments false
if errorlevel 1 (
    echo.
    echo MINIFY FAILED: all_plugins.min.js is now STALE relative to
    echo                all_plugins.js. Do NOT ship. Fix terser, re-run.
    pause
    exit /b 1
)

echo.
echo Done. Both bundles rebuilt:
for %%F in (all_plugins.js all_plugins.min.js) do @echo    %%~zF bytes  %%F
pause
