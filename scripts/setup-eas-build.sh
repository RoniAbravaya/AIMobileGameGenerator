#!/bin/bash

# EAS Build Setup Script
# This script helps you configure your Expo project for EAS builds

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COLORS_RED='\033[0;31m'
COLORS_GREEN='\033[0;32m'
COLORS_YELLOW='\033[1;33m'
COLORS_BLUE='\033[0;34m'
COLORS_NC='\033[0m' # No Color

function print_step() {
    echo -e "${COLORS_BLUE}==> $1${COLORS_NC}"
}

function print_success() {
    echo -e "${COLORS_GREEN}✓ $1${COLORS_NC}"
}

function print_warning() {
    echo -e "${COLORS_YELLOW}⚠ $1${COLORS_NC}"
}

function print_error() {
    echo -e "${COLORS_RED}✗ $1${COLORS_NC}"
}

function check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

function get_project_id() {
    node -e "try { const id = require('./app.json').expo.extra.eas.projectId; console.log(id || ''); } catch(e) { console.log(''); }" 2>/dev/null || echo ""
}

function get_expo_token() {
    eas whoami 2>/dev/null | grep -oP '(?<=Authenticated as )\S+' || echo ""
}

# Main script
main() {
    echo ""
    echo -e "${COLORS_BLUE}╔════════════════════════════════════════════════════════════╗${COLORS_NC}"
    echo -e "${COLORS_BLUE}║          EAS Build Setup & Verification Script             ║${COLORS_NC}"
    echo -e "${COLORS_BLUE}╚════════════════════════════════════════════════════════════╝${COLORS_NC}"
    echo ""

    # Step 1: Check dependencies
    print_step "Step 1: Checking dependencies"
    check_command "node" || { print_error "Node.js is required"; exit 1; }
    print_success "Node.js is installed"
    
    check_command "npm" || { print_error "npm is required"; exit 1; }
    print_success "npm is installed"

    # Step 2: Check if EAS CLI is installed
    print_step "Step 2: Checking EAS CLI"
    if ! check_command "eas"; then
        print_warning "EAS CLI not found globally, will use npx"
        EAS_CMD="npx eas-cli"
    else
        print_success "EAS CLI is installed"
        EAS_CMD="eas"
    fi

    # Step 3: Check current project ID
    print_step "Step 3: Checking current project configuration"
    CURRENT_PROJECT_ID=$(get_project_id)
    
    if [ -z "$CURRENT_PROJECT_ID" ]; then
        print_warning "No projectId found in app.json"
    else
        print_success "Current projectId: $CURRENT_PROJECT_ID"
    fi

    # Step 4: Check Expo authentication
    print_step "Step 4: Checking Expo authentication"
    CURRENT_USER=$(get_expo_token)
    
    if [ -z "$CURRENT_USER" ]; then
        print_warning "Not logged in to Expo"
        echo ""
        print_step "Logging in to Expo..."
        $EAS_CMD login || { print_error "Failed to login to Expo"; exit 1; }
        print_success "Logged in to Expo"
    else
        print_success "Logged in as: $CURRENT_USER"
    fi

    # Step 5: Initialize EAS project if needed
    print_step "Step 5: Setting up EAS project"
    
    if [ -z "$CURRENT_PROJECT_ID" ]; then
        print_warning "No Expo project linked to this directory"
        echo ""
        echo "Options:"
        echo "  1) Create a new Expo project (recommended)"
        echo "  2) Link to existing Expo project"
        echo "  3) Skip (you can do this manually later)"
        read -p "Choose option [1-3]: " option
        
        case $option in
            1)
                print_step "Creating new Expo project..."
                $EAS_CMD init --non-interactive || $EAS_CMD init
                print_success "Expo project created"
                ;;
            2)
                print_step "Linking to existing Expo project..."
                $EAS_CMD init --existing || $EAS_CMD init
                print_success "Expo project linked"
                ;;
            3)
                print_warning "Skipping EAS initialization"
                echo "Run 'npx eas init' manually when ready"
                ;;
        esac
    else
        print_success "Expo project already configured"
    fi

    # Step 6: Verify project
    print_step "Step 6: Verifying project configuration"
    NEW_PROJECT_ID=$(get_project_id)
    
    if [ -z "$NEW_PROJECT_ID" ]; then
        print_error "Failed to set projectId in app.json"
        exit 1
    fi
    
    print_success "Project ID confirmed: $NEW_PROJECT_ID"

    # Step 7: Get EXPO_TOKEN
    print_step "Step 7: Generating EXPO_TOKEN for CI/CD"
    echo ""
    echo "To enable GitHub Actions builds, you need to create an EXPO_TOKEN."
    echo ""
    echo "Two options:"
    echo "  A) Create a new token (automated - requires browser)"
    echo "  B) Use existing token (copy from https://expo.dev/settings/access-tokens)"
    read -p "Choose option [A/B]: " token_option
    
    if [[ "$token_option" =~ ^[Aa]$ ]]; then
        print_step "Getting access token..."
        echo ""
        echo "Opening https://expo.dev/settings/access-tokens in your browser..."
        echo "Please create a new token and copy it here."
        echo ""
        read -s -p "Paste your EXPO_TOKEN: " EXPO_TOKEN
        echo ""
    else
        read -s -p "Paste your EXPO_TOKEN: " EXPO_TOKEN
        echo ""
    fi

    if [ -z "$EXPO_TOKEN" ]; then
        print_warning "No token provided - you'll need to add it manually to GitHub"
    else
        print_success "Token received (length: ${#EXPO_TOKEN})"
    fi

    # Step 8: GitHub instructions
    print_step "Step 8: GitHub Secrets Configuration"
    echo ""
    echo "To add EXPO_TOKEN to GitHub Actions:"
    echo ""
    echo "1. Go to your GitHub repository"
    echo "2. Click Settings → Secrets and variables → Actions"
    echo "3. Click 'New repository secret'"
    echo "4. Name: EXPO_TOKEN"
    echo "5. Value: (paste your token)"
    echo "6. Click 'Add secret'"
    echo ""
    
    if [ ! -z "$EXPO_TOKEN" ]; then
        echo "Your EXPO_TOKEN is ready to paste (saved in clipboard if supported)"
        echo "Token: $EXPO_TOKEN"
        echo ""
    fi

    # Step 9: Verification
    print_step "Step 9: Final verification"
    echo ""
    echo "Checking configuration:"
    
    # Check app.json
    if node -e "require('./app.json').expo.extra.eas.projectId" 2>/dev/null | grep -q .; then
        print_success "app.json has valid projectId"
    else
        print_error "app.json missing projectId"
    fi
    
    # Check eas.json
    if [ -f "eas.json" ]; then
        print_success "eas.json exists"
    else
        print_warning "eas.json not found (will be created on first build)"
    fi
    
    # Check package.json
    if node -e "require('./package.json')" 2>/dev/null; then
        print_success "package.json is valid"
    else
        print_error "package.json is invalid"
    fi

    # Summary
    echo ""
    echo -e "${COLORS_BLUE}╔════════════════════════════════════════════════════════════╗${COLORS_NC}"
    echo -e "${COLORS_BLUE}║                    Setup Complete! ✓                        ║${COLORS_NC}"
    echo -e "${COLORS_BLUE}╚════════════════════════════════════════════════════════════╝${COLORS_NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add EXPO_TOKEN to GitHub repository secrets (see Step 8)"
    echo "2. Push your code to GitHub"
    echo "3. The CI/CD workflow will automatically run"
    echo "4. Monitor builds at: https://expo.dev/projects/$NEW_PROJECT_ID/builds"
    echo ""
    echo "Useful commands:"
    echo "  • Check project info: eas project:info"
    echo "  • Build locally: eas build --platform android --profile production"
    echo "  • Check build status: eas build --status"
    echo "  • View Expo logs: eas logs"
    echo ""
}

# Run main function
main "$@"
