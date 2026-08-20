[CmdletBinding()]
param(
    [ValidateSet("doctor", "run", "status")]
    [string]$Action = "status",

    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[A-Za-z0-9_-]+$")]
    [string]$RepoName,

    [switch]$InfisicalInjected
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$normalizedRepoName = $RepoName.ToLowerInvariant()
$profile = "$normalizedRepoName-local"
$secretName = "${normalizedRepoName}_chatgpt_tunnel_api_key"
$healthUrl = "http://127.0.0.1:8080"

function Resolve-TunnelClient {
    if ($env:TUNNEL_CLIENT_PATH) {
        if (-not (Test-Path -LiteralPath $env:TUNNEL_CLIENT_PATH -PathType Leaf)) {
            throw "TUNNEL_CLIENT_PATH does not point to a file: $env:TUNNEL_CLIENT_PATH"
        }
        return (Resolve-Path -LiteralPath $env:TUNNEL_CLIENT_PATH).Path
    }

    $command = Get-Command tunnel-client -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $downloads = Join-Path $env:USERPROFILE "Downloads"
    $candidate = Get-ChildItem -Path $downloads -Filter "tunnel-client.exe" -File -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($candidate) {
        return $candidate.FullName
    }

    throw "tunnel-client was not found. Put it on PATH or set TUNNEL_CLIENT_PATH."
}

if ($Action -eq "status") {
    try {
        $response = Invoke-WebRequest -Uri "$healthUrl/readyz" -UseBasicParsing -TimeoutSec 5
        Write-Host "Tunnel for '$normalizedRepoName' is ready ($($response.StatusCode)): $healthUrl/ui"
        exit 0
    }
    catch {
        Write-Error "Tunnel for '$normalizedRepoName' is not ready at $healthUrl/readyz. Run doctor, then start it."
        exit 1
    }
}

if (-not $InfisicalInjected) {
    if (-not (Get-Command infisical -ErrorAction SilentlyContinue)) {
        throw "Infisical CLI was not found on PATH."
    }

    $childArguments = @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $PSCommandPath,
        "-Action", $Action,
        "-RepoName", $normalizedRepoName,
        "-InfisicalInjected"
    )

    & infisical run --silent --project-config-dir $repoRoot -- powershell @childArguments
    exit $LASTEXITCODE
}

$secretValue = [Environment]::GetEnvironmentVariable($secretName, "Process")
if ([string]::IsNullOrWhiteSpace($secretValue)) {
    throw "Infisical did not inject the required secret '$secretName'."
}

$tunnelClient = Resolve-TunnelClient
$env:CONTROL_PLANE_API_KEY = $secretValue
$env:ELECTRON_RUN_AS_NODE = "1"
try {
    if ($Action -eq "doctor") {
        & $tunnelClient doctor --profile $profile --explain
    }
    else {
        & $tunnelClient run --profile $profile
    }
    exit $LASTEXITCODE
}
finally {
    Remove-Item Env:CONTROL_PLANE_API_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    Remove-Item "Env:$secretName" -ErrorAction SilentlyContinue
}
