param(
    [Parameter(Mandatory = $true)]
    [string]$SkillName
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $repoRoot "skills\$SkillName"
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$targetRoot = Join-Path $codexHome "skills"
$targetPath = Join-Path $targetRoot $SkillName

if (-not (Test-Path $sourcePath)) {
    Write-Error "Skill not found: $SkillName"
    exit 1
}

New-Item -ItemType Directory -Force $targetPath | Out-Null
Get-ChildItem -Path $sourcePath -Force | Copy-Item -Destination $targetPath -Recurse -Force

if ($env:SKILL_INSTALL_SKIP_HOOKS -ne "1") {
    $hook = Join-Path $targetPath "scripts\post-install.ps1"
    if (Test-Path $hook) {
        Write-Host "Running post-install hook for $SkillName..."
        $env:SKILL_INSTALL_SOURCE = $sourcePath
        $env:SKILL_INSTALL_TARGET = $targetPath
        $env:CODEX_HOME = $codexHome
        & $hook $targetPath
    }
}

Write-Host "Installed $SkillName to $targetPath"
