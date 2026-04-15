param(
    [string]$SkillDir = $env:SKILL_INSTALL_TARGET
)

$ErrorActionPreference = "Stop"

if (-not $SkillDir) {
    $SkillDir = Split-Path -Parent $PSScriptRoot
}

$vendorRoot = Join-Path $SkillDir "vendor"
$gstackDir = Join-Path $vendorRoot "gstack"

function Find-Bun {
    $env:PATH = (Join-Path $HOME ".bun\bin") + [System.IO.Path]::PathSeparator + $env:PATH
    $cmd = Get-Command bun -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    return $null
}

function Test-BunCompile {
    $bun = Find-Bun
    if (-not $bun) {
        return $false
    }
    $tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("bun-compile-smoke-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force $tmpRoot | Out-Null
    $src = Join-Path $tmpRoot "smoke.ts"
    $out = Join-Path $tmpRoot "smoke"
    Set-Content -Path $src -Value 'console.log("ok")' -Encoding UTF8
    try {
        $null = & $bun build --compile $src --outfile $out 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
        $null = & $out 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        Remove-Item -Recurse -Force $tmpRoot -ErrorAction SilentlyContinue
    }
}

function Test-BinaryRuntime {
    param([string]$Candidate)
    if (-not $Candidate -or -not (Test-Path $Candidate)) {
        return $false
    }
    try {
        $help = & $Candidate --help 2>$null
        return (($help -join "`n") -match "gstack|browse")
    } catch {
        return $false
    }
}

function Test-BinarySmoke {
    param([string]$Candidate)
    $stateRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("gstack-browse-smoke-" + [System.Guid]::NewGuid().ToString("N"))
    $stateDir = Join-Path $stateRoot ".gstack"
    New-Item -ItemType Directory -Force $stateDir | Out-Null
    $oldState = $env:BROWSE_STATE_FILE
    $env:BROWSE_STATE_FILE = Join-Path $stateDir "browse.json"
    try {
        $null = & $Candidate goto "https://example.com" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $null = & $Candidate stop 2>$null
            return $true
        }
        $null = & $Candidate restart 2>$null
        $null = & $Candidate goto "https://example.com" 2>$null
        $ok = $LASTEXITCODE -eq 0
        if ($ok) {
            $null = & $Candidate stop 2>$null
        }
        return $ok
    } catch {
        return $false
    } finally {
        $env:BROWSE_STATE_FILE = $oldState
        Remove-Item -Recurse -Force $stateRoot -ErrorAction SilentlyContinue
    }
}

function Remove-VendoredSkillDocs {
    param([string]$Root)
    if (-not $Root -or -not (Test-Path $Root)) {
        return
    }
    Get-ChildItem -Path $Root -Recurse -Filter SKILL.md -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    foreach ($extra in @(".agents", ".factory", ".kiro", ".opencode", ".slate", ".cursor", "openclaw")) {
        Remove-Item -Recurse -Force (Join-Path $Root $extra) -ErrorAction SilentlyContinue
    }
}

function Find-GstackBrowse {
    if ($env:GSTACK_BROWSE_BIN -and (Test-BinaryRuntime $env:GSTACK_BROWSE_BIN) -and (Test-BinarySmoke $env:GSTACK_BROWSE_BIN)) {
        return $env:GSTACK_BROWSE_BIN
    }

    $candidates = @((Join-Path $SkillDir "vendor\gstack\browse\dist\browse.exe"), (Join-Path $SkillDir "vendor\gstack\browse\dist\browse"))
    foreach ($candidate in $candidates) {
        if ((Test-BinaryRuntime $candidate) -and (Test-BinarySmoke $candidate)) {
            return $candidate
        }
    }
    return $null
}

$existing = Find-GstackBrowse
if ($existing) {
    Remove-VendoredSkillDocs $gstackDir
    Write-Host "gstack browse binary already available: $existing"
    exit 0
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git is required to install gstack browse for kr-naver-browse."
}

function Ensure-Bun {
    $env:PATH = (Join-Path $HOME ".bun\bin") + [System.IO.Path]::PathSeparator + $env:PATH
    if ((Get-Command bun -ErrorAction SilentlyContinue) -and (Test-BunCompile)) {
        return
    }
    if ($env:SKILL_INSTALL_AUTO_BUN -eq "0") {
        throw "A Bun installation that can produce runnable compiled binaries is required to build gstack browse. Install Bun or provide GSTACK_BROWSE_BIN with an existing gstack browse binary."
    }
    $brew = Get-Command brew -ErrorAction SilentlyContinue
    if ($brew) {
        Write-Host "bun is missing; trying Homebrew formula oven-sh/bun/bun..."
        brew install oven-sh/bun/bun
        if ((Get-Command bun -ErrorAction SilentlyContinue) -and (Test-BunCompile)) {
            return
        }
    }
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        Write-Host "bun is still missing; trying npm global package..."
        npm install -g bun
        if ((Get-Command bun -ErrorAction SilentlyContinue) -and (Test-BunCompile)) {
            return
        }
    }
    $curl = Get-Command curl -ErrorAction SilentlyContinue
    if ($curl) {
        Write-Host "bun is still missing or cannot compile runnable binaries; trying official bun installer..."
        $tmp = New-TemporaryFile
        try {
            curl -fsSL "https://bun.sh/install" -o $tmp.FullName
            if (-not $env:BUN_VERSION_TAG) {
                $env:BUN_VERSION_TAG = "bun-v1.3.10"
            }
            $env:BUN_INSTALL = Join-Path $HOME ".bun"
            bash $tmp.FullName $env:BUN_VERSION_TAG
            $env:PATH = (Join-Path $HOME ".bun\bin") + [System.IO.Path]::PathSeparator + $env:PATH
            if ((Get-Command bun -ErrorAction SilentlyContinue) -and (Test-BunCompile)) {
                return
            }
        } finally {
            Remove-Item -Force $tmp.FullName -ErrorAction SilentlyContinue
        }
    }
    throw "A Bun installation that can produce runnable compiled binaries is required to build gstack browse, and automatic install failed. Install Bun or provide GSTACK_BROWSE_BIN with an existing gstack browse binary."
}

New-Item -ItemType Directory -Force $vendorRoot | Out-Null

if (-not (Test-Path (Join-Path $gstackDir ".git"))) {
    if (Test-Path $gstackDir) {
        Remove-Item -Recurse -Force $gstackDir
    }
    git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git $gstackDir
} else {
    git -C $gstackDir pull --ff-only
}

Ensure-Bun

# If we reached this point, the existing binary was missing or failed smoke.
# Force gstack setup/build to create a fresh compiled browser binary instead
# of reusing a stale artifact whose mtime still looks current.
Remove-Item -Force (Join-Path $gstackDir "browse\dist\browse.exe") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $gstackDir "browse\dist\browse") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $gstackDir "browse\dist\find-browse.exe") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $gstackDir "browse\dist\find-browse") -ErrorAction SilentlyContinue

Push-Location $gstackDir
try {
    bun install
    bun run build
    bunx playwright install chromium
} finally {
    Pop-Location
}
Remove-VendoredSkillDocs $gstackDir

$installed = Find-GstackBrowse
if (-not $installed) {
    throw "gstack browse install finished, but no usable browse binary was found."
}
Write-Host "Installed gstack browse binary: $installed"
