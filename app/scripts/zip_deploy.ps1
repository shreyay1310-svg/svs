$appDir = "d:\svs\app"
$tempDir = "$appDir\temp_deploy_dir"

# Clean up any existing temp dir
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}

# Create temp dir
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Create dist folder in temp
New-Item -ItemType Directory -Path "$tempDir\dist" -Force | Out-Null

Write-Host "Copying deployment files..."
# Copy dist contents
Copy-Item -Path "$appDir\dist\*" -Destination "$tempDir\dist" -Recurse -Force

# Copy root configs
Copy-Item -Path "$appDir\.env" -Destination $tempDir -Force
Copy-Item -Path "$appDir\app.js" -Destination $tempDir -Force
Copy-Item -Path "$appDir\package.json" -Destination $tempDir -Force
Copy-Item -Path "$appDir\web.config" -Destination $tempDir -Force

if (Test-Path "$appDir\package-lock.json") {
    Copy-Item -Path "$appDir\package-lock.json" -Destination $tempDir -Force
}

# Remove existing dist-deploy.zip
$zipPath = "$appDir\dist-deploy.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "Zipping deploy files..."
$topLevelItems = Get-ChildItem -Path $tempDir -Force | ForEach-Object { $_.FullName }
Compress-Archive -Path $topLevelItems -DestinationPath $zipPath -Force

Write-Host "Cleaning up..."
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Deploy ZIP created successfully at $zipPath"
