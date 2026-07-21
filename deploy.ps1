# Build the project
npm run build

# Restructure dist to .vercel/output in Build Output API v3 format
if (Test-Path ".vercel/output") {
  Remove-Item -Recurse -Force ".vercel/output"
}
New-Item -ItemType Directory -Force -Path ".vercel/output" | Out-Null

# Copy config.json
Copy-Item "dist\config.json" ".vercel\output\config.json"

# Rename client/ -> static/
if (Test-Path "dist\client") {
  Copy-Item -Recurse -Force "dist\client" ".vercel\output\static"
}

# Copy server/ -> functions/__server.func/ (keep original ESM imports)
if (Test-Path "dist\server") {
  New-Item -ItemType Directory -Force -Path ".vercel\output\functions\__server.func" | Out-Null
  Copy-Item -Recurse -Force "dist\server\*" ".vercel\output\functions\__server.func\"
}

# Copy minimal node_modules for bare imports (from both server.js and assets)
$funcDir = ".vercel\output\functions\__server.func"
$result = node copy-nodemodules.cjs "$funcDir" "node_modules" 2>&1
Write-Host $result

# Add package.json with type:module so .js files are treated as ESM
'{"type":"module"}' | Set-Content -Path "$funcDir\package.json" -NoNewline

# Create .vc-config.json for the serverless function
$vcConfig = @{
  handler = "server.js"
  launcherType = "Nodejs"
  shouldAddHelpers = $false
  supportsResponseStreaming = $true
  runtime = "nodejs22.x"
} | ConvertTo-Json
Set-Content -Path "$funcDir\.vc-config.json" -Value $vcConfig -NoNewline

# Deploy prebuilt to Vercel production
npx vercel deploy --prebuilt --prod --yes --archive=tgz
