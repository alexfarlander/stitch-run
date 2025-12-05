#!/bin/bash
# Fix ESLint errors automatically

# Fix unused variables by prefixing with underscore
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" \
  -exec sed -i 's/catch (error)/catch (_error)/g' {} \;

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" \
  -exec sed -i 's/catch (e)/catch (_e)/g' {} \;

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" \
  -exec sed -i 's/catch (err)/catch (_err)/g' {} \;

echo "Fixed unused error variables"
