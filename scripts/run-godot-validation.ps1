param(
    [string]$GodotExecutable = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repositoryRoot "godot"

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

    throw "Godot was not found. Pass -GodotExecutable with the path to a Godot 4.7.1 console executable."
}

function Invoke-ValidationStep {
    param(
        [string]$Label,
        [string]$Executable,
        [string[]]$Arguments
    )

    Write-Host "==> $Label"
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

$godot = Resolve-GodotExecutable -RequestedPath $GodotExecutable
Write-Host "Using Godot: $godot"

Invoke-ValidationStep "Import project from a clean checkout" $godot @(
    "--headless", "--editor", "--path", $projectPath, "--quit"
)
Invoke-ValidationStep "Run simulation and persistence tests" $godot @(
    "--headless", "--path", $projectPath, "--script", "res://tests/run.gd"
)
Invoke-ValidationStep "Run complete UI interaction route" $godot @(
    "--headless", "--path", $projectPath, "--script", "res://tests/ui_interaction_test.gd"
)
Invoke-ValidationStep "Verify world hotspot layout" $godot @(
    "--headless", "--path", $projectPath, "--script", "res://tests/world_layout_test.gd"
)
Invoke-ValidationStep "Verify truthful worker presentation" $godot @(
    "--headless", "--path", $projectPath, "--script", "res://tests/worker_presentation_test.gd"
)

Write-Host "Old Stables Godot validation passed."
