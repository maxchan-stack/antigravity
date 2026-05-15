#!/bin/bash
echo "Running pre-push checks..."

# 1. Syntax check for Code.js
node -c Code.js
if [ $? -ne 0 ]; then
    echo -e "\033[31mSyntax error in Code.js. Push aborted.\033[0m"
    exit 1
fi

# 2. Check for unsafe characters in JS comments within HTML files
node check_gas_comments.js
if [ $? -ne 0 ]; then
    echo -e "\033[31mGAS Comment Safety Check failed. Push aborted.\033[0m"
    exit 1
fi

echo -e "\033[32mAll checks passed! Pushing to GAS...\033[0m"
clasp push
