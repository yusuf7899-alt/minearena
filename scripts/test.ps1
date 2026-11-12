# Moneta Automated Test & Verification Script
Write-Host "=== Running Moneta Automated Test Suite ===" -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m pytest tests/ -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tests Failed!" -ForegroundColor Red
    exit 1
}
Write-Host "All Tests Passed Successfully!" -ForegroundColor Green

