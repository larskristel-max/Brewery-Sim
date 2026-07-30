param(
    [string]$GodotExecutable = "",
    [switch]$InstallTemplates
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$godotVersion = "4.7.1"
$templateVersion = "4.7.1.stable"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repositoryRoot "godot"
$buildRoot = Join-Path $repositoryRoot "build\playtest"
$packageName = "Old-Stables-Windows"
$packagePath = Join-Path $buildRoot $packageName
$executablePath = Join-Path $packagePath "Old-Stables-Playtest.exe"
$archivePath = Join-Path $buildRoot "$packageName.zip"
$guidePath = Join-Path $repositoryRoot "docs\windows-playtest-guide.md"

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

function Install-GodotExportTemplates {
    param([string]$TargetDirectory)

    $downloadUrl = "https://github.com/godotengine/godot-builds/releases/download/4.7.1-stable/Godot_v4.7.1-stable_export_templates.tpz"
    $workingDirectory = Join-Path $env:TEMP "old-stables-godot-4.7.1-templates"
    $archive = Join-Path $workingDirectory "export_templates.tpz"
    $extractDirectory = Join-Path $workingDirectory "extracted"

    New-Item -ItemType Directory -Path $workingDirectory -Force | Out-Null

    Write-Host "Downloading official Godot $godotVersion export templates (about 1.2 GB)..."
    & curl.exe --fail --location --continue-at - --output $archive $downloadUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Godot export-template download failed with exit code $LASTEXITCODE."
    }

    if (Test-Path -LiteralPath $extractDirectory) {
        $resolvedExtract = [System.IO.Path]::GetFullPath($extractDirectory)
        $resolvedWorking = [System.IO.Path]::GetFullPath($workingDirectory)
        if (-not $resolvedExtract.StartsWith($resolvedWorking, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to clear a template extraction path outside the template workspace."
        }
        Remove-Item -LiteralPath $extractDirectory -Recurse -Force
    }
    New-Item -ItemType Directory -Path $extractDirectory -Force | Out-Null

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($archive, $extractDirectory)
    $templateSource = Join-Path $extractDirectory "templates"
    if (-not (Test-Path -LiteralPath (Join-Path $templateSource "windows_release_x86_64.exe") -PathType Leaf)) {
        throw "The official archive did not contain the Windows release template."
    }

    New-Item -ItemType Directory -Path $TargetDirectory -Force | Out-Null
    Copy-Item -Path (Join-Path $templateSource "*") -Destination $TargetDirectory -Recurse -Force
}

$godot = Resolve-GodotExecutable -RequestedPath $GodotExecutable
$templateDirectory = Join-Path $env:APPDATA "Godot\export_templates\$templateVersion"
$windowsTemplate = Join-Path $templateDirectory "windows_release_x86_64.exe"

if (-not (Test-Path -LiteralPath $windowsTemplate -PathType Leaf)) {
    if (-not $InstallTemplates) {
        throw "Godot $templateVersion export templates are missing. Re-run with -InstallTemplates."
    }
    Install-GodotExportTemplates -TargetDirectory $templateDirectory
}

if (Test-Path -LiteralPath $packagePath) {
    $resolvedPackage = [System.IO.Path]::GetFullPath($packagePath)
    $resolvedBuildRoot = [System.IO.Path]::GetFullPath($buildRoot)
    if (-not $resolvedPackage.StartsWith($resolvedBuildRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clear a package path outside build/playtest."
    }
    Remove-Item -LiteralPath $packagePath -Recurse -Force
}
New-Item -ItemType Directory -Path $packagePath -Force | Out-Null

Write-Host "Exporting Old Stables Windows playtest..."
& $godot --headless --path $projectPath --export-release "Windows Playtest" $executablePath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $executablePath -PathType Leaf)) {
    throw "Godot Windows export failed."
}

Copy-Item -LiteralPath $guidePath -Destination (Join-Path $packagePath "PLAYTEST-GUIDE.md") -Force
$commit = (& git -C $repositoryRoot rev-parse --short HEAD).Trim()
$buildInfo = @(
    "Old Stables Windows Playtest"
    "Source commit: $commit"
    "Godot: $godotVersion"
    "Built UTC: $([DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ'))"
    "Analytics: none"
)
Set-Content -LiteralPath (Join-Path $packagePath "BUILD-INFO.txt") -Value $buildInfo -Encoding UTF8

$launchCheckRoot = Join-Path $env:TEMP ("old-stables-playtest-launch-check-" + [Guid]::NewGuid().ToString("N"))
$launchCheckExecutable = Join-Path $launchCheckRoot "Old-Stables-Playtest.exe"
New-Item -ItemType Directory -Path $launchCheckRoot -Force | Out-Null
Copy-Item -LiteralPath $executablePath -Destination $launchCheckExecutable -Force

Write-Host "Launch-checking a disposable copy of the exported game..."
$launchProcess = Start-Process -FilePath $launchCheckExecutable -ArgumentList @("--headless", "--quit-after", "3") -WindowStyle Hidden -Wait -PassThru
if ($launchProcess.ExitCode -ne 0) {
    throw "The exported game failed its launch check with exit code $($launchProcess.ExitCode)."
}

for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
        $stream = [System.IO.File]::Open($launchCheckExecutable, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None)
        $stream.Dispose()
        break
    }
    catch {
        if ($attempt -eq 19) {
            throw "The exported game remained locked after its launch check."
        }
        Start-Sleep -Milliseconds 500
    }
}
Remove-Item -LiteralPath $launchCheckRoot -Recurse -Force -ErrorAction SilentlyContinue

if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}
Compress-Archive -Path (Join-Path $packagePath "*") -DestinationPath $archivePath -CompressionLevel Optimal
$hash = Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
$checksumPath = "$archivePath.sha256.txt"
Set-Content -LiteralPath $checksumPath -Value "$($hash.Hash)  $([System.IO.Path]::GetFileName($archivePath))" -Encoding ASCII

Write-Host "Windows playtest build ready:"
Write-Host "  Package: $archivePath"
Write-Host "  Checksum: $checksumPath"
Write-Host "  SHA-256: $($hash.Hash)"
