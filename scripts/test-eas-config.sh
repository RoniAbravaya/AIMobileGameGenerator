#!/bin/bash

# EAS Build Configuration Test Script
# Validates that the EAS build configuration is correct before running actual builds

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧪 EAS Build Configuration Test"
echo "==============================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test 1: Verify app.json structure
echo "${BLUE}Test 1: Validating app.json structure...${NC}"
test_app_configs() {
    local test_dir="$1"
    local app_json="$test_dir/app.json"
    
    if [ ! -f "$app_json" ]; then
        echo -e "${RED}✗${NC} Missing app.json"
        return 1
    fi
    
    # Validate JSON is parseable
    if ! python3 -c "import json; json.load(open('$app_json'))" 2>/dev/null; then
        echo -e "${RED}✗${NC} Invalid JSON in app.json"
        return 1
    fi
    
    # Check for required EAS config
    if ! python3 -c "
import json
data = json.load(open('$app_json'))
assert 'expo' in data, 'Missing expo key'
assert 'extra' in data['expo'], 'Missing expo.extra'
assert 'eas' in data['expo']['extra'], 'Missing expo.extra.eas'
assert 'projectId' in data['expo']['extra']['eas'], 'Missing projectId'
assert data['expo']['extra']['eas']['projectId'], 'Empty projectId'
" 2>/dev/null; then
        echo -e "${RED}✗${NC} Missing or incomplete EAS configuration"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} $(basename $test_dir): app.json is valid"
    return 0
}

# Test 2: Verify eas.json structure
echo "${BLUE}Test 2: Validating eas.json structure...${NC}"
test_eas_json() {
    local test_dir="$1"
    local eas_json="$test_dir/eas.json"
    
    if [ ! -f "$eas_json" ]; then
        echo -e "${YELLOW}⚠${NC} $(basename $test_dir): No eas.json found (optional)"
        return 0
    fi
    
    # Validate JSON is parseable
    if ! python3 -c "import json; json.load(open('$eas_json'))" 2>/dev/null; then
        echo -e "${RED}✗${NC} $(basename $test_dir): Invalid JSON in eas.json"
        return 1
    fi
    
    # Check for build configuration
    if ! python3 -c "
import json
data = json.load(open('$eas_json'))
assert 'build' in data, 'Missing build key'
assert 'production' in data['build'], 'Missing production profile'
" 2>/dev/null; then
        echo -e "${RED}✗${NC} $(basename $test_dir): Invalid EAS build configuration"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} $(basename $test_dir): eas.json is valid"
    return 0
}

# Test 3: Verify environment setup
echo "${BLUE}Test 3: Checking environment...${NC}"
if [ -z "$EXPO_TOKEN" ]; then
    echo -e "${YELLOW}⚠${NC} EXPO_TOKEN not set in environment"
    echo "   To enable builds, set: export EXPO_TOKEN=your_token"
else
    echo -e "${GREEN}✓${NC} EXPO_TOKEN is configured"
fi

# Run tests
echo ""
echo "${BLUE}Running validation tests...${NC}"
echo ""

FAILED=0

# Test game template
echo "Testing game-template..."
if ! test_app_configs "$WORKSPACE_ROOT/game-template"; then
    FAILED=$((FAILED + 1))
fi
if ! test_eas_json "$WORKSPACE_ROOT/game-template"; then
    FAILED=$((FAILED + 1))
fi

echo ""
echo "Testing generated games..."
for game_dir in "$WORKSPACE_ROOT/agent/generated-games"/game-*; do
    if [ -d "$game_dir" ]; then
        if ! test_app_configs "$game_dir"; then
            FAILED=$((FAILED + 1))
        fi
        if ! test_eas_json "$game_dir"; then
            FAILED=$((FAILED + 1))
        fi
    fi
done

# Final report
echo ""
echo "==============================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Your EAS configuration is ready. Next steps:"
    echo "1. Set EXPO_TOKEN environment variable"
    echo "2. Run: cd game-template && eas build --platform android --profile production"
    echo "3. Or trigger the GitHub Actions workflow"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    echo "Failed tests: $FAILED"
    exit 1
fi
