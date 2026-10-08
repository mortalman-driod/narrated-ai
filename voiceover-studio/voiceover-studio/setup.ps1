[CmdletBinding()]
param(
    [ValidateSet('piper', 'kokoro', 'both')][string]$Engine = 'piper',
    [switch]$WithXtts,
    [switch]$AcceptXttsLicense,
    [switch]$SkipModels,
    [switch]$SkipFrontend
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}

if ($WithXtts -and -not $AcceptXttsLicense) {
    throw 'Read the XTTS non-commercial model/output license in README, then pass -AcceptXttsLicense if you accept it.'
}
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue) -or -not (Get-Command ffprobe -ErrorAction SilentlyContinue)) {
    throw 'Install ffmpeg and ffprobe and add both to PATH before setup (see README).'
}
$pythonExe = Join-Path $PSScriptRoot 'backend/.venv/Scripts/python.exe'
$uvCommand = Get-Command uv -ErrorAction SilentlyContinue
if (-not (Test-Path -LiteralPath $pythonExe)) {
    if ($uvCommand) {
        Invoke-Checked -Program $uvCommand.Source -Arguments @('venv', '--python', '3.11', 'backend/.venv')
    } else {
        Invoke-Checked -Program 'py' -Arguments @('-3.11', '-m', 'venv', 'backend/.venv')
    }
}
$extras = @('dev', 'queue', 'piper')
if ($Engine -in @('kokoro', 'both')) { $extras += 'kokoro' }
if ($WithXtts) { $extras += 'xtts' }
$package = './backend[' + ($extras -join ',') + ']'
if ($uvCommand) {
    Invoke-Checked -Program $uvCommand.Source -Arguments @('pip', 'install', '--python', $pythonExe, '-e', $package)
} else {
    Invoke-Checked -Program $pythonExe -Arguments @('-m', 'pip', 'install', '-e', $package)
}
# Misaki must find the spaCy language data while offline, including on first run.
if ($Engine -in @('kokoro', 'both')) {
    $spacyWheel = 'https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl'
    if ($uvCommand) {
        Invoke-Checked -Program $uvCommand.Source -Arguments @('pip', 'install', '--python', $pythonExe, $spacyWheel)
    } else {
        Invoke-Checked -Program $pythonExe -Arguments @('-m', 'pip', 'install', $spacyWheel)
    }
}
if (-not $SkipModels) {
    Invoke-Checked -Program $pythonExe -Arguments @('scripts/download_models.py', '--engine', 'piper')
    if ($Engine -in @('kokoro', 'both')) {
        Invoke-Checked -Program $pythonExe -Arguments @('scripts/download_models.py', '--engine', 'kokoro')
    }
    if ($WithXtts) {
        Invoke-Checked -Program $pythonExe -Arguments @('scripts/download_models.py', '--engine', 'xtts', '--accept-xtts-license')
    }
}
if (-not $SkipFrontend) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) { throw 'Node.js with npm is required; see README or use -SkipFrontend.' }
    Push-Location -LiteralPath (Join-Path $PSScriptRoot 'frontend')
    try {
        if (Test-Path -LiteralPath 'package-lock.json') { Invoke-Checked -Program $npmCommand.Source -Arguments @('ci') }
        else { Invoke-Checked -Program $npmCommand.Source -Arguments @('install') }
        Invoke-Checked -Program $npmCommand.Source -Arguments @('run', 'build')
    } finally { Pop-Location }
}
Invoke-Checked -Program $pythonExe -Arguments @('scripts/preflight.py')
Write-Host 'Setup finished. Start: backend/.venv/Scripts/python.exe -m uvicorn studio.api:app --app-dir backend --host 127.0.0.1 --port 8000'
