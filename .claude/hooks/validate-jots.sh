#!/bin/bash

# Read all stdin first (hooks receive JSON via stdin)
input=$(cat)

# Parse file_path from tool_input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

# Only validate if jots.json was edited
if [[ "$file_path" == *"jots.json" ]]; then
  cd "$CLAUDE_PROJECT_DIR" || exit 0

  # Run validator using the jots CLI
  output=$(npx jots validate 2>&1)
  exit_code=$?

  if [ $exit_code -ne 0 ]; then
    echo "$output" >&2
    exit 2
  fi
fi

exit 0
