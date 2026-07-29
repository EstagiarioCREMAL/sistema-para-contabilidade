# ============================================================
# Script: create-github-release.ps1
# Cria uma GitHub Release v1.1.0 e faz upload dos arquivos
# necessários para o auto-updater funcionar.
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$owner      = "EstagiarioCREMAL"
$repo       = "sistema-para-contabilidade"
$tag        = "v1.2.2"
$releaseName = "v1.2.2 - Dashboard completo com Jeton e VALID"
$releaseBody = "## O que há de novo nesta versão`n`n- **Dashboard completo**: cards de Jeton (Viagens) e Relatório VALID agora aparecem no painel`n- **Cards inteligentes**: relatórios com orçamento mostram barra de progresso e saldo; sem orçamento mostram total de despesas`n- Inclui todas as correções de importação do Excel das versões anteriores"

$releaseDir = Join-Path $PSScriptRoot "release"
$headers = @{
    "Authorization" = "token $Token"
    "Accept"        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Host "=== Criando Release $tag no GitHub ===" -ForegroundColor Cyan

# 1. Verifica se os arquivos existem
$exeFile  = Join-Path $releaseDir "Instalador-CremalContabil.exe"
$ymlFile  = Join-Path $releaseDir "latest.yml"
$blockmap = Join-Path $releaseDir "Instalador-CremalContabil.exe.blockmap"

foreach ($f in @($exeFile, $ymlFile, $blockmap)) {
    if (-not (Test-Path $f)) {
        Write-Host "ERRO: Arquivo nao encontrado: $f" -ForegroundColor Red
        Write-Host "Execute primeiro: npm run electron:build" -ForegroundColor Yellow
        exit 1
    }
}

# 2. Verifica se a tag já existe e deleta a release antiga se necessário
Write-Host "Verificando releases existentes..." -ForegroundColor Gray
try {
    $existingRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" `
        -Headers $headers -ErrorAction Stop
    Write-Host "Release $tag ja existe (id=$($existingRelease.id)). Deletando..." -ForegroundColor Yellow
    Invoke-RestMethod -Method Delete -Uri "https://api.github.com/repos/$owner/$repo/releases/$($existingRelease.id)" `
        -Headers $headers | Out-Null
    Write-Host "Release antiga deletada." -ForegroundColor Gray
} catch {
    Write-Host "Nenhuma release existente para $tag. Criando nova..." -ForegroundColor Gray
}

# Também deleta a tag remota se existir
try {
    Invoke-RestMethod -Method Delete -Uri "https://api.github.com/repos/$owner/$repo/git/refs/tags/$tag" `
        -Headers $headers -ErrorAction SilentlyContinue | Out-Null
} catch {}

# 3. Cria a Release
Write-Host "Criando release $tag..." -ForegroundColor Cyan
$releaseBody_obj = @{
    tag_name         = $tag
    target_commitish = "main"
    name             = $releaseName
    body             = $releaseBody
    draft            = $false
    prerelease       = $false
} | ConvertTo-Json -Compress

$release = Invoke-RestMethod -Method Post `
    -Uri "https://api.github.com/repos/$owner/$repo/releases" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $releaseBody_obj

$uploadUrl = $release.upload_url -replace '\{\?name,label\}', ''
Write-Host "Release criada! ID: $($release.id)" -ForegroundColor Green

# 4. Função de upload
function Upload-Asset {
    param([string]$FilePath, [string]$MimeType)
    $fileName = Split-Path $FilePath -Leaf
    $fileSize = (Get-Item $FilePath).Length
    Write-Host "  Uploading $fileName ($([math]::Round($fileSize/1MB, 1)) MB)..." -ForegroundColor Gray

    $uploadHeaders = @{
        "Authorization" = "token $Token"
        "Accept"        = "application/vnd.github+json"
        "Content-Type"  = $MimeType
    }

    $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $response = Invoke-RestMethod -Method Post `
        -Uri "${uploadUrl}?name=$fileName" `
        -Headers $uploadHeaders `
        -Body $fileBytes

    Write-Host "  OK: $($response.browser_download_url)" -ForegroundColor Green
}

# 5. Faz upload dos 3 arquivos necessários para o auto-updater
Write-Host "`nFazendo upload dos arquivos..." -ForegroundColor Cyan
Upload-Asset -FilePath $ymlFile  -MimeType "application/x-yaml"
Upload-Asset -FilePath $blockmap -MimeType "application/octet-stream"
Upload-Asset -FilePath $exeFile  -MimeType "application/octet-stream"

Write-Host "`n=== CONCLUIDO! ===" -ForegroundColor Green
Write-Host "Release disponivel em: https://github.com/$owner/$repo/releases/tag/$tag" -ForegroundColor Cyan
Write-Host "`nO auto-updater ja pode detectar e baixar esta versao automaticamente." -ForegroundColor Green
