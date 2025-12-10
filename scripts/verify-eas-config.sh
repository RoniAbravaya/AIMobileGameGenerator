#!/bin/bash

# EAS Configuration Verification Script
# This script validates that all game configurations have valid EAS project IDs

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAMES_DIR="$WORKSPACE_ROOT/agent/generated-games"
TEMPLATE_DIR="$WORKSPACE_ROOT/game-template"

echo "🔍 EAS Configuration Verification"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# UUID validation regex - matches standard UUID format
UUID_REGEX="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"

# Function to validate UUID
validate_uuid() {
    local uuid="$1"
    if [[ $uuid =~ $UUID_REGEX ]]; then
        return 0
    else
        return 1
    fi
}

# Function to check a single game
check_game() {
    local game_path="$1"
    local app_json="$game_path/app.json"
    
    if [ ! -f "$app_json" ]; then
        echo -e "${RED}✗${NC} Missing app.json in $game_path"
        return 1
    fi
    
    # Extract the projectId using Python (more reliable JSON parsing)
    local project_id=$(python3 -c "import json; f=open('$app_json'); data=json.load(f); print(data['expo']['extra']['eas']['projectId'])" 2>/dev/null || echo "")
    
    if [ -z "$project_id" ]; then
        echo -e "${RED}✗${NC} No EAS projectId found in $app_json"
        return 1
    fi
    
    if validate_uuid "$project_id"; then
        echo -e "${GREEN}✓${NC} $(basename $game_path): $project_id"
        return 0
    else
        echo -e "${RED}✗${NC} $(basename $game_path): Invalid UUID format - $project_id"
        return 1
    fi
}

# Check game template
echo "Checking game template..."
check_game "$TEMPLATE_DIR"
TEMPLATE_RESULT=$?

echo ""
echo "Checking generated games..."
FAILED=0
for game_dir in "$GAMES_DIR"/game-*; do
    if [ -d "$game_dir" ]; then
        if ! check_game "$game_dir"; then
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "================================"
if [ $TEMPLATE_RESULT -eq 0 ] && [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All configurations are valid!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Your games now have valid EAS project IDs"
    echo "2. The EAS build should work correctly"
    echo "3. Each game has a unique UUID for EAS tracking"
    exit 0
else
    echo -e "${RED}✗ Configuration validation failed!${NC}"
    echo "Failed checks: $FAILED"
    exit 1
fi
