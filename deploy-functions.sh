#!/bin/bash

# Supabase Functions Auto Deploy Script
# This script deploys all functions in the supabase/functions directory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --dry-run|-d)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --verbose    Show detailed output"
            echo "  -d, --dry-run    Show what would be deployed without actually deploying"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if Supabase CLI is installed
check_supabase_cli() {
    if command -v supabase &> /dev/null; then
        local version=$(supabase --version 2>/dev/null)
        print_color $GREEN "✓ Supabase CLI found: $version"
        return 0
    else
        print_color $RED "✗ Supabase CLI not found"
        print_color $YELLOW "Please install Supabase CLI: npm install -g supabase"
        return 1
    fi
}

# Function to check if we're in a Supabase project
check_supabase_project() {
    if [ -f "supabase/config.toml" ]; then
        print_color $GREEN "✓ Supabase project detected"
        return 0
    else
        print_color $RED "✗ Not a Supabase project (supabase/config.toml not found)"
        print_color $YELLOW "Please run this script from the root of your Supabase project"
        return 1
    fi
}

# Function to get all function directories
get_function_directories() {
    local functions_path="supabase/functions"
    
    if [ ! -d "$functions_path" ]; then
        print_color $RED "✗ Functions directory not found: $functions_path"
        return 1
    fi
    
    # Find all directories except __shared_data
    local functions=($(find "$functions_path" -maxdepth 1 -type d -name "*" | grep -v "__shared_data" | sed 's|.*/||' | sort))
    echo "${functions[@]}"
}

# Function to deploy a single function
deploy_function() {
    local function_name=$1
    
    print_color $BLUE "Deploying function: $function_name"
    
    if [ "$DRY_RUN" = true ]; then
        print_color $YELLOW "  [DRY RUN] Would deploy: supabase functions deploy $function_name"
        return 0
    fi
    
    if supabase functions deploy "$function_name" 2>&1; then
        print_color $GREEN "  ✓ Successfully deployed: $function_name"
        return 0
    else
        print_color $RED "  ✗ Failed to deploy: $function_name"
        return 1
    fi
}

# Function to deploy all functions
deploy_all_functions() {
    local functions=("$@")
    local total_functions=${#functions[@]}
    
    print_color $BLUE ""
    print_color $BLUE "🚀 Starting deployment of $total_functions functions..."
    
    local success_count=0
    local failed_functions=()
    
    for function in "${functions[@]}"; do
        if deploy_function "$function"; then
            ((success_count++))
        else
            failed_functions+=("$function")
        fi
        
        # Add a small delay between deployments to avoid rate limiting
        sleep 0.5
    done
    
    # Summary
    print_color $BLUE ""
    print_color $BLUE "📊 Deployment Summary:"
    echo "  Total functions: $total_functions"
    print_color $GREEN "  Successful: $success_count"
    print_color $RED "  Failed: ${#failed_functions[@]}"
    
    if [ ${#failed_functions[@]} -gt 0 ]; then
        print_color $RED ""
        print_color $RED "❌ Failed functions:"
        for func in "${failed_functions[@]}"; do
            print_color $RED "  - $func"
        done
        
        print_color $YELLOW ""
        print_color $YELLOW "💡 You can retry failed functions individually:"
        for func in "${failed_functions[@]}"; do
            print_color $YELLOW "  supabase functions deploy $func"
        done
    fi
    
    return ${#failed_functions[@]}
}

# Main execution
main() {
    print_color $BLUE "🔧 Supabase Functions Auto Deploy Script"
    print_color $BLUE "========================================="
    
    # Check prerequisites
    if ! check_supabase_cli; then
        exit 1
    fi
    
    if ! check_supabase_project; then
        exit 1
    fi
    
    # Get function directories
    local functions
    readarray -t functions < <(get_function_directories)
    
    if [ ${#functions[@]} -eq 0 ]; then
        print_color $YELLOW "No functions found to deploy"
        exit 0
    fi
    
    print_color $BLUE ""
    print_color $BLUE "📁 Found ${#functions[@]} functions to deploy:"
    for func in "${functions[@]}"; do
        echo "  - $func"
    done
    
    if [ "$DRY_RUN" = true ]; then
        print_color $YELLOW ""
        print_color $YELLOW "🔍 DRY RUN MODE - No actual deployment will occur"
    fi
    
    # Confirm deployment (skip if dry run)
    if [ "$DRY_RUN" = false ]; then
        echo ""
        read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_color $YELLOW "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Deploy all functions
    if deploy_all_functions "${functions[@]}"; then
        print_color $GREEN ""
        print_color $GREEN "🎉 All functions deployed successfully!"
        exit 0
    else
        print_color $YELLOW ""
        print_color $YELLOW "⚠️  Some functions failed to deploy. Check the output above."
        exit 1
    fi
}

# Run the main function
main 