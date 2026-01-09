#!/bin/bash

# Read all stdin first (hooks receive JSON via stdin)
input=$(cat)

# Parse file_path from tool_input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

# Only lint TypeScript files in this project
if [[ "$file_path" == *.ts ]] && [[ "$file_path" == *"/jots/"* ]]; then
  cd "$CLAUDE_PROJECT_DIR" || exit 0

  # Capture lint output
  lint_output=$(npm run lint 2>&1)
  lint_exit=$?

  if [ $lint_exit -ne 0 ]; then
    echo "$lint_output" >&2
    exit 2
  fi
fi

exit 0
