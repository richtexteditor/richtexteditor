@echo off
REM Rebuild all_plugins.js, stripping any UTF-8 BOM from source files so
REM they concatenate into a single parseable script.
del all_plugins.js 2>nul

powershell -NoProfile -Command ^
  "$files = Get-ChildItem -Filter '*.js' | Where-Object { $_.Name -ne 'all_plugins.js' -and $_.Name -notin @('crdt-engine.js','crdt-engine.min.js') };" ^
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

pause
