#!/usr/bin/env pwsh

# Supabase Functions Auto Deploy Script
# This script deploys all functions in the supabase/functions directory

param(
    [switch]$Verbose,
    [switch]$DryRun
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $Reset
    )
    Write-Host "$Color$Message$Reset"
}

# Function to check if Supabase CLI is installed
function Test-SupabaseCLI {
    try {
        $version = supabase --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✓ Supabase CLI found: $version" $Green
            return $true
        }
        else {
            Write-ColorOutput "✗ Supabase CLI not found" $Red
            Write-ColorOutput "Please install Supabase CLI: npm install -g supabase" $Yellow
            return $false
        }
    }
    catch {
        Write-ColorOutput "✗ Supabase CLI not found" $Red
        Write-ColorOutput "Please install Supabase CLI: npm install -g supabase" $Yellow
        return $false
    }
}
}

# Function to check if we're in a Supabase project
function Test-SupabaseProject {
    if (Test-Path "supabase/config.toml") {
        Write-ColorOutput "✓ Supabase project detected" $Green
        return $true
    }
    else {
        Write-ColorOutput "✗ Not a Supabase project (supabase/config.toml not found)" $Red
        Write-ColorOutput "Please run this script from the root of your Supabase project" $Yellow
        return $false
    }
}

# Function to get all function directories
function Get-FunctionDirectories {
    $functionsPath = "supabase/functions"
    if (-not (Test-Path $functionsPath)) {
        Write-ColorOutput "✗ Functions directory not found: $functionsPath" $Red
        return @()
    }
    
    $directories = Get-ChildItem -Path $functionsPath -Directory | Where-Object { $_.Name -ne "__shared_data" }
    return $directories
}

# Function to deploy a single function
function Deploy-Function {
    param(
        [string]$FunctionName
    )
    
    Write-ColorOutput "Deploying function: $FunctionName" $Blue
    
    if ($DryRun) {
        Write-ColorOutput "  [DRY RUN] Would deploy: supabase functions deploy $FunctionName" $Yellow
        return $true
    }
    
    try {
        $output = supabase functions deploy $FunctionName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✓ Successfully deployed: $FunctionName" $Green
            if ($Verbose) {
                Write-Host $output
            }
            return $true
        }
        else {
            Write-ColorOutput "  ✗ Failed to deploy: $FunctionName" $Red
            Write-Host $output
            return $false
        }
    }
    catch {
        Write-ColorOutput "  ✗ Error deploying: $FunctionName" $Red
        Write-Host $_.Exception.Message
        return $false
    }
}

# Function to deploy all functions
function Deploy-AllFunctions {
    param(
        [array]$Functions
    )
    
    Write-ColorOutput "`n🚀 Starting deployment of $($Functions.Count) functions..." $Blue
    
    $successCount = 0
    $failedFunctions = @()
    
    foreach ($function in $Functions) {
        $functionName = $function.Name
        $success = Deploy-Function -FunctionName $functionName
        
        if ($success) {
            $successCount++
        }
        else {
            $failedFunctions += $functionName
        }
        
        # Add a small delay between deployments to avoid rate limiting
        Start-Sleep -Milliseconds 500
    }
    
    # Summary
    Write-ColorOutput "`n📊 Deployment Summary:" $Blue
    Write-ColorOutput "  Total functions: $($Functions.Count)" $Reset
    Write-ColorOutput "  Successful: $successCount" $Green
    Write-ColorOutput "  Failed: $($failedFunctions.Count)" $Red
    
    if ($failedFunctions.Count -gt 0) {
        Write-ColorOutput "`n❌ Failed functions:" $Red
        foreach ($func in $failedFunctions) {
            Write-ColorOutput "  - $func" $Red
        }
        Write-ColorOutput "`n💡 You can retry failed functions individually:" $Yellow
        foreach ($func in $failedFunctions) {
            Write-ColorOutput "  supabase functions deploy $func" $Yellow
        }
    }
    
    return $failedFunctions.Count -eq 0
}

# Main execution
function Main {
    Write-ColorOutput "🔧 Supabase Functions Auto Deploy Script" $Blue
    Write-ColorOutput "=========================================" $Blue
    
    # Check prerequisites
    if (-not (Test-SupabaseCLI)) {
        exit 1
    }
    
    if (-not (Test-SupabaseProject)) {
        exit 1
    }
    
    # Get function directories
    $functions = Get-FunctionDirectories
    if ($functions.Count -eq 0) {
        Write-ColorOutput "No functions found to deploy" $Yellow
        exit 0
    }
    
    Write-ColorOutput "`n📁 Found $($functions.Count) functions to deploy:" $Blue
    foreach ($func in $functions) {
        Write-ColorOutput "  - $($func.Name)" $Reset
    }
    
    if ($DryRun) {
        Write-ColorOutput "`n🔍 DRY RUN MODE - No actual deployment will occur" $Yellow
    }
    
    # Confirm deployment (skip if dry run)
    if (-not $DryRun) {
        $confirmation = Read-Host "`nDo you want to proceed with deployment? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-ColorOutput "Deployment cancelled" $Yellow
            exit 0
        }
    }
    
    # Deploy all functions
    $success = Deploy-AllFunctions -Functions $functions
    
    if ($success) {
        Write-ColorOutput "`n🎉 All functions deployed successfully!" $Green
        exit 0
    }
    else {
        Write-ColorOutput "`n⚠️  Some functions failed to deploy. Check the output above." $Yellow
        exit 1
    }
}

# Run the main function
Main