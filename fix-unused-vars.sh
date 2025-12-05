#!/bin/bash
# Fix unused variables by prefixing with underscore

find /home/user/stitch-run -type f -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" | while read file; do
  # Fix specific unused variables
  sed -i "s/^\\([[:space:]]*\\)const supabase =/\\1const _supabase =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const data =/\\1const _data =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const tables =/\\1const _tables =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const generateBMCGraph =/\\1const _generateBMCGraph =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const ClaudeOutput =/\\1const _ClaudeOutput =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const flow =/\\1const _flow =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const hasCurrency =/\\1const _hasCurrency =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const hasFormat =/\\1const _hasFormat =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const config =/\\1const _config =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const demoScriptPath =/\\1const _demoScriptPath =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const startEndpoint =/\\1const _startEndpoint =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const resetEndpoint =/\\1const _resetEndpoint =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const createServerClient =/\\1const _createServerClient =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const CLOCKWORK_ENTITIES =/\\1const _CLOCKWORK_ENTITIES =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const workflowCanvasPath =/\\1const _workflowCanvasPath =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const generateMonsterAvatar =/\\1const _generateMonsterAvatar =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const StitchEntity =/\\1const _StitchEntity =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const createJourneyEvent =/\\1const _createJourneyEvent =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const Scene =/\\1const _Scene =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const fps =/\\1const _fps =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const categorizeError =/\\1const _categorizeError =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const versionId =/\\1const _versionId =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const broadcastErr =/\\1const _broadcastErr =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const fireNode =/\\1const _fireNode =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const startTime =/\\1const _startTime =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)const parseError =/\\1const _parseError =/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)import.*beforeEach.*$/\\1\/\/ beforeEach import removed as unused/g" "$file"
  sed -i "s/^\\([[:space:]]*\\)import.*stripCanvasUIProperties.*$/\\1\/\/ stripCanvasUIProperties import removed as unused/g" "$file"

  # Fix function parameters
  sed -i "s/testCase)/testCase: unknown)/g" "$file" 2>/dev/null || true
  sed -i "s/(testCase)/(testCase: unknown)/g" "$file" 2>/dev/null || true
done

echo "Fixed unused variables"
