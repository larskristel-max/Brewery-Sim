param(
    [string]$SourceDirectory = "",
    [string]$RuntimeDirectory = "",
    [string]$FfmpegExecutable = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
if (-not $SourceDirectory) {
    $SourceDirectory = Join-Path $repositoryRoot "godot\assets\audio\source-masters"
}
if (-not $RuntimeDirectory) {
    $RuntimeDirectory = Join-Path $repositoryRoot "godot\assets\audio\runtime"
}

$durations = @{
    "207781-hq-preview.ogg" = 4.0
    "216134-hq-preview.ogg" = 30.0
    "234317-hq-preview.ogg" = 30.0
    "264123-hq-preview.ogg" = 82.0
    "275471-hq-preview.ogg" = 5.0
    "353125-hq-preview.ogg" = 2.0
    "369710-hq-preview.ogg" = 1.5
    "470710-hq-preview.ogg" = 2.0
    "495660-hq-preview.ogg" = 30.0
    "517610-hq-preview.ogg" = 3.5
    "520143-hq-preview.ogg" = 2.0
    "565799-hq-preview.ogg" = 10.0
    "627657-hq-preview.ogg" = 68.0
    "663380-hq-preview.ogg" = 42.0
    "675975-hq-preview.ogg" = 34.0
    "686544-hq-preview.ogg" = 1.2
    "698136-hq-preview.ogg" = 1.5
    "709961-hq-preview.ogg" = 29.5
    "737643-hq-preview.ogg" = 13.0
}

$stereoFiles = @(
    "216134-hq-preview.ogg",
    "234317-hq-preview.ogg",
    "495660-hq-preview.ogg",
    "663380-hq-preview.ogg",
    "737643-hq-preview.ogg"
)

if (-not $FfmpegExecutable) {
    $ffmpegCommand = Get-Command "ffmpeg" -ErrorAction SilentlyContinue
    if ($ffmpegCommand) {
        $FfmpegExecutable = $ffmpegCommand.Source
    }
}

if (-not $FfmpegExecutable -or -not (Test-Path -LiteralPath $FfmpegExecutable -PathType Leaf)) {
    throw "FFmpeg is required to prepare the Safari-compatible MP3 runtime palette."
}

New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null
foreach ($entry in $durations.GetEnumerator() | Sort-Object Name) {
    $sourcePath = Join-Path $SourceDirectory $entry.Name
    $runtimeName = [IO.Path]::ChangeExtension($entry.Name, ".mp3")
    $runtimePath = Join-Path $RuntimeDirectory $runtimeName
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing audited audio master: $sourcePath"
    }
    $bytes = [IO.File]::ReadAllBytes($sourcePath)
    $channels = if ($stereoFiles -contains $entry.Name) { 2 } else { 1 }
    $bitrate = if ($channels -eq 2) { "112k" } else { "80k" }
    & $FfmpegExecutable -hide_banner -loglevel error -y -i $sourcePath -t $entry.Value -map_metadata -1 -vn -ac $channels -ar 44100 -c:a libmp3lame -b:a $bitrate $runtimePath
    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg failed while preparing $($entry.Name)."
    }
    $runtimeLength = (Get-Item -LiteralPath $runtimePath).Length
    [pscustomobject]@{
        File = $runtimeName
        Seconds = $entry.Value
        SourceBytes = $bytes.Length
        RuntimeBytes = $runtimeLength
    }
}
