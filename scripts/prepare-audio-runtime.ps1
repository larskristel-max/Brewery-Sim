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

function Find-VorbisSampleRate {
    param([byte[]]$Bytes)

    $signature = [byte[]](1, 118, 111, 114, 98, 105, 115)
    $limit = [Math]::Min($Bytes.Length - 16, 4096)
    for ($offset = 0; $offset -le $limit; $offset++) {
        $matches = $true
        for ($index = 0; $index -lt $signature.Length; $index++) {
            if ($Bytes[$offset + $index] -ne $signature[$index]) {
                $matches = $false
                break
            }
        }
        if ($matches) {
            return [BitConverter]::ToUInt32($Bytes, $offset + 12)
        }
    }
    throw "Vorbis identification header was not found."
}

function Get-OggPrefixLength {
    param(
        [byte[]]$Bytes,
        [double]$Seconds
    )

    $sampleRate = Find-VorbisSampleRate -Bytes $Bytes
    $targetSamples = [int64][Math]::Ceiling($Seconds * $sampleRate)
    $offset = 0
    while ($offset + 27 -le $Bytes.Length) {
        if ($Bytes[$offset] -ne 79 -or $Bytes[$offset + 1] -ne 103 -or $Bytes[$offset + 2] -ne 103 -or $Bytes[$offset + 3] -ne 83) {
            throw "Invalid Ogg page at byte $offset."
        }
        $segmentCount = [int]$Bytes[$offset + 26]
        if ($offset + 27 + $segmentCount -gt $Bytes.Length) {
            throw "Truncated Ogg segment table at byte $offset."
        }
        $payloadLength = 0
        for ($index = 0; $index -lt $segmentCount; $index++) {
            $payloadLength += [int]$Bytes[$offset + 27 + $index]
        }
        $nextOffset = $offset + 27 + $segmentCount + $payloadLength
        if ($nextOffset -gt $Bytes.Length) {
            throw "Truncated Ogg page payload at byte $offset."
        }
        $granulePosition = [BitConverter]::ToInt64($Bytes, $offset + 6)
        if ($granulePosition -ge $targetSamples) {
            return $nextOffset
        }
        $offset = $nextOffset
    }
    return $Bytes.Length
}

New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null
foreach ($entry in $durations.GetEnumerator() | Sort-Object Name) {
    $sourcePath = Join-Path $SourceDirectory $entry.Name
    $runtimePath = Join-Path $RuntimeDirectory $entry.Name
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing audited audio master: $sourcePath"
    }
    $bytes = [IO.File]::ReadAllBytes($sourcePath)
    if ($FfmpegExecutable) {
        if (-not (Test-Path -LiteralPath $FfmpegExecutable -PathType Leaf)) {
            throw "FFmpeg was not found at $FfmpegExecutable"
        }
        $channels = if ($stereoFiles -contains $entry.Name) { 2 } else { 1 }
        & $FfmpegExecutable -hide_banner -loglevel error -y -i $sourcePath -t $entry.Value -map_metadata -1 -vn -ac $channels -ar 44100 -c:a libvorbis -q:a 1 $runtimePath
        if ($LASTEXITCODE -ne 0) {
            throw "FFmpeg failed while preparing $($entry.Name)."
        }
    } else {
        $prefixLength = Get-OggPrefixLength -Bytes $bytes -Seconds $entry.Value
        if ($prefixLength -eq $bytes.Length) {
            [IO.File]::WriteAllBytes($runtimePath, $bytes)
        } else {
            $runtimeBytes = New-Object byte[] $prefixLength
            [Array]::Copy($bytes, $runtimeBytes, $prefixLength)
            [IO.File]::WriteAllBytes($runtimePath, $runtimeBytes)
        }
    }
    $runtimeLength = (Get-Item -LiteralPath $runtimePath).Length
    [pscustomobject]@{
        File = $entry.Name
        Seconds = $entry.Value
        SourceBytes = $bytes.Length
        RuntimeBytes = $runtimeLength
    }
}
