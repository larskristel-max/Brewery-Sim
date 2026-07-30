param(
    [string]$GodotExecutable = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repositoryRoot "godot"
$sitePath = Join-Path $repositoryRoot "web-playtest"
$exportPath = Join-Path $sitePath "public\game\index.html"
$templatePath = Join-Path $env:APPDATA "Godot\export_templates\4.7.1.stable\web_nothreads_release.zip"

function Resolve-GodotExecutable {
    param([string]$RequestedPath)

    if ($RequestedPath) {
        $resolved = Resolve-Path -LiteralPath $RequestedPath -ErrorAction SilentlyContinue
        if ($resolved) {
            return $resolved.Path
        }
        throw "Godot executable not found at '$RequestedPath'."
    }

    foreach ($commandName in @("godot", "godot4")) {
        $command = Get-Command $commandName -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    $portable = Join-Path $env:TEMP "godot-4.7.1\Godot_v4.7.1-stable_win64_console.exe"
    if (Test-Path -LiteralPath $portable -PathType Leaf) {
        return $portable
    }

    throw "Godot 4.7.1 was not found. Pass -GodotExecutable with the console executable path."
}

if (-not (Test-Path -LiteralPath $templatePath -PathType Leaf)) {
    throw "Godot's single-threaded web export template is missing. Install the official 4.7.1 templates first."
}

$gameDirectory = Split-Path -Parent $exportPath
if (Test-Path -LiteralPath $gameDirectory) {
    $resolvedGameDirectory = [System.IO.Path]::GetFullPath($gameDirectory)
    $resolvedSitePublic = [System.IO.Path]::GetFullPath((Join-Path $sitePath "public"))
    if (-not $resolvedGameDirectory.StartsWith($resolvedSitePublic, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clear a game export outside web-playtest/public."
    }
    Remove-Item -LiteralPath $gameDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $gameDirectory -Force | Out-Null

$godot = Resolve-GodotExecutable -RequestedPath $GodotExecutable
Write-Host "Exporting the single-threaded Old Stables browser build..."
& $godot --headless --path $projectPath --export-release "Web Playtest" $exportPath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exportPath -PathType Leaf)) {
    throw "Godot web export failed."
}

$requiredFiles = @(
    $exportPath,
    (Join-Path $gameDirectory "index.js"),
    (Join-Path $gameDirectory "index.wasm"),
    (Join-Path $gameDirectory "index.pck")
)
foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Godot web export is incomplete: missing '$file'."
    }
}

$wasmPath = Join-Path $gameDirectory "index.wasm"
$wasmChunkSize = 20MB
$wasmPartPaths = @()
$inputStream = [System.IO.File]::OpenRead($wasmPath)
try {
    $buffer = New-Object byte[] (1MB)
    $partIndex = 0
    while ($inputStream.Position -lt $inputStream.Length) {
        $partPath = "$wasmPath.$partIndex"
        $wasmPartPaths += $partPath
        $outputStream = [System.IO.File]::Create($partPath)
        try {
            $remaining = [Math]::Min(
                [long]$wasmChunkSize,
                $inputStream.Length - $inputStream.Position
            )
            while ($remaining -gt 0) {
                $requested = [int][Math]::Min($buffer.Length, $remaining)
                $read = $inputStream.Read($buffer, 0, $requested)
                if ($read -le 0) {
                    throw "Unexpected end of the Godot WebAssembly runtime."
                }
                $outputStream.Write($buffer, 0, $read)
                $remaining -= $read
            }
        }
        finally {
            $outputStream.Dispose()
        }
        $partIndex += 1
    }
}
finally {
    $inputStream.Dispose()
}

$engineScriptPath = Join-Path $gameDirectory "index.js"
$engineScript = [System.IO.File]::ReadAllText($engineScriptPath)
$partExpressions = @()
$partSizeExpressions = @()
for ($partIndex = 0; $partIndex -lt $wasmPartPaths.Count; $partIndex++) {
    $partExpressions += ('`${loadPath}.wasm.' + $partIndex + '`')
    $partSizeExpressions += (
        'this.config.fileSizes[`${basePath}.wasm.' + $partIndex + '`]'
    )
}
$wasmPartList = '[' + ($partExpressions -join ', ') + ']'
$wasmPartSizeList = '[' + ($partSizeExpressions -join ', ') + ']'
$splitLoader = @"
const wasmParts = $wasmPartList;
			loadPromise = Promise.all(wasmParts.map(function (part, index) {
				return preloader.loadPromise(part, size[index] || 0);
			})).then(function (buffers) {
				const total = buffers.reduce(function (sum, buffer) {
					return sum + buffer.byteLength;
				}, 0);
				const merged = new Uint8Array(total);
				let offset = 0;
				buffers.forEach(function (buffer) {
					merged.set(new Uint8Array(buffer), offset);
					offset += buffer.byteLength;
				});
				return new Response(merged, {
					'headers': [['content-type', 'application/wasm']],
				});
			});
"@
$engineScript = $engineScript.Replace(
    'loadPromise = preloader.loadPromise(`${loadPath}.wasm`, size, true);',
    $splitLoader.TrimEnd()
)
$engineScript = $engineScript.Replace(
    'this.config.fileSizes[`${basePath}.wasm`]',
    $wasmPartSizeList
)
[System.IO.File]::WriteAllText($engineScriptPath, $engineScript)

$exportHtml = [System.IO.File]::ReadAllText($exportPath)
$partSizeEntries = @()
for ($partIndex = 0; $partIndex -lt $wasmPartPaths.Count; $partIndex++) {
    $partLength = (Get-Item -LiteralPath $wasmPartPaths[$partIndex]).Length
    $partSizeEntries += (
        '"index.wasm.' + $partIndex + '":' + $partLength
    )
}
$exportHtml = [System.Text.RegularExpressions.Regex]::Replace(
    $exportHtml,
    '"index\.wasm":\d+',
    ($partSizeEntries -join ',')
)
$exportHtml = $exportHtml.Replace(
    "setStatusMode('hidden');",
    @"
setStatusMode('hidden');
			window.parent.postMessage(
				{ type: 'old-stables-game-ready' },
				window.location.origin,
			);
"@.TrimEnd()
)
[System.IO.File]::WriteAllText($exportPath, $exportHtml)

Remove-Item -LiteralPath $wasmPath -Force

$totalBytes = (Get-ChildItem -LiteralPath $gameDirectory -File | Measure-Object -Property Length -Sum).Sum
Write-Host "Browser export ready: $gameDirectory"
Write-Host ("Payload: {0:N1} MB" -f ($totalBytes / 1MB))
