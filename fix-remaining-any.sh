#!/bin/bash
# Fix all remaining any types

find /home/user/stitch-run -type f -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" | while read file; do
  # Fix common any patterns
  sed -i 's/: any\[\]/: unknown[]/g' "$file"
  sed -i 's/: any)/: unknown)/g' "$file"
  sed -i 's/: any;/: unknown;/g' "$file"
  sed -i 's/: any =/: unknown =/g' "$file"
  sed -i 's/: any$/: unknown/g' "$file"
  sed -i 's/<any>/<unknown>/g' "$file"
  sed -i 's/\[key: string\]: any/[key: string]: unknown/g' "$file"
done

echo "Fixed remaining any types"
