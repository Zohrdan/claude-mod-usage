# usage-bar status line for Windows: model, context fill, 5h / weekly limits and cost.
# Works without plugins, bash or jq; runs on Windows PowerShell 5.1 and PowerShell 7.
# Claude Code pipes the session's JSON to stdin. ASCII-only source on purpose:
# Windows PowerShell 5.1 misreads UTF-8 files without a BOM.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
if (-not $data) { exit 0 }

$E = [char]27
$BOLD = "$E[1m"; $RESET = "$E[0m"; $DIM = "$E[2m"
$GLYPH_LINE = [string][char]0x2501   # heavy horizontal
$GLYPH_HALF = [string][char]0x2578   # heavy left half
$GLYPH_STAR = [string][char]0x273B
$GLYPH_CYCLE = [string][char]0x21BB

function Rgb([string]$hex) {
  $r = [Convert]::ToInt32($hex.Substring(1, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(3, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(5, 2), 16)
  "$E[38;2;$r;$g;${b}m"
}
$TRACK = Rgb '#52525b'

function Heat([double]$p, [string]$base) {
  if ($p -ge 90) { return Rgb '#fb7185' }
  if ($p -ge 70) { return Rgb '#fbbf24' }
  Rgb $base
}

function Bar([double]$p, [int]$w) {
  $p = [Math]::Max(0, [Math]::Min(100, $p))
  $halves = [int][Math]::Round($p / 100 * $w * 2)
  $full = [Math]::Floor($halves / 2)
  $halfCell = $halves % 2
  $empty = $w - $full - $halfCell
  ($GLYPH_LINE * $full) + ($GLYPH_HALF * $halfCell) + $TRACK + ($GLYPH_LINE * $empty)
}

function Tok([double]$n) {
  if ($n -ge 1000000) { $v = $n / 1000000; if ($v -eq [Math]::Floor($v)) { return "$([int]$v)M" } else { return ('{0:0.0}M' -f $v).Replace(',', '.') } }
  if ($n -ge 1000) { return "$([int][Math]::Round($n / 1000))k" }
  "$([int]$n)"
}

function Left($t) {
  if ($null -eq $t -or "$t" -eq '') { return '' }
  if ("$t" -match '^\d+$') { $at = [DateTimeOffset]::FromUnixTimeSeconds([long]$t) }
  else { $at = [DateTimeOffset]::Parse("$t", [Globalization.CultureInfo]::InvariantCulture) }
  $m = [int][Math]::Floor(($at - [DateTimeOffset]::UtcNow).TotalMinutes)
  if ($m -le 0) { return 'now' }
  $d = [Math]::Floor($m / 1440); $h = [Math]::Floor(($m % 1440) / 60); $mm = $m % 60
  if ($d -gt 0) { return "${d}d${h}h" }
  if ($h -gt 0) { return "${h}h${mm}m" }
  "${mm}m"
}

function Meter([string]$label, [double]$p, [string]$hex, [string]$tail) {
  $c = Heat $p $hex
  $pct = ('{0,3}%' -f [int][Math]::Floor($p))
  $s = "$c$BOLD$label$RESET $c$(Bar $p 10)$RESET $c$BOLD$pct$RESET"
  if ($tail) { $s += " $DIM$tail$RESET" }
  "$s   "
}

$out = ''
if ($data.model.display_name) { $out += "$(Rgb '#d97757')$BOLD$GLYPH_STAR$RESET $BOLD$($data.model.display_name)$RESET   " }

$ctx = $data.context_window
if ($null -ne $ctx.used_percentage) {
  $tail = ''
  if ($ctx.total_input_tokens -and $ctx.context_window_size) { $tail = "$(Tok $ctx.total_input_tokens)/$(Tok $ctx.context_window_size)" }
  $out += Meter 'ctx' $ctx.used_percentage '#5eead4' $tail
}

foreach ($l in @(@('five_hour', '5h', '#a78bfa'), @('seven_day', 'wk', '#60a5fa'))) {
  $lim = $data.rate_limits.($l[0])
  if ($null -eq $lim.used_percentage) { continue }
  $r = Left $lim.resets_at
  $tail = ''; if ($r) { $tail = "$GLYPH_CYCLE $r" }
  $out += Meter $l[1] $lim.used_percentage $l[2] $tail
}

if ($null -ne $data.cost.total_cost_usd) {
  $out += "$(Rgb '#86efac')$BOLD`$$(([double]$data.cost.total_cost_usd).ToString('0.00', [Globalization.CultureInfo]::InvariantCulture))$RESET"
}

[Console]::Out.Write($out.TrimEnd() + "`n")
