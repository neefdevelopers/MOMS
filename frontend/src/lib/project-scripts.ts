export interface ProjectScript {
  id: string;
  title: string;
  scriptText: string;
  hook?: string;
  sceneNumber?: number;
  duration?: string;
  targetPlatform?: string;
  contentType?: string;
  notes?: string;
  status?: 'DRAFT' | 'APPROVED' | 'IN_REVISION' | 'FINAL';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Parses project notes or calendar caption into an array of structured ProjectScript items.
 * Handles both JSON arrays (multi-script) and legacy plain text gracefully.
 */
export function parseProjectScripts(
  rawNotes?: string | null,
  fallbackTitle: string = 'Master Shooting Script'
): ProjectScript[] {
  if (!rawNotes || !rawNotes.trim()) {
    return [];
  }

  const trimmed = rawNotes.trim();

  // Check if it's JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: item.id || `script-${idx + 1}-${Date.now()}`,
          title: item.title || `Script #${idx + 1}`,
          scriptText: item.scriptText || item.text || item.content || item.notes || '',
          hook: item.hook || '',
          sceneNumber: typeof item.sceneNumber === 'number' ? item.sceneNumber : idx + 1,
          duration: item.duration || '',
          targetPlatform: item.targetPlatform || item.platform || '',
          contentType: item.contentType || '',
          notes: item.notes || '',
          status: item.status || 'FINAL',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt,
        }));
      }
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.scripts)) {
        return parsed.scripts;
      }
    } catch {
      // Not JSON, fall through to plaintext
    }
  }

  // Plain text fallback
  return [
    {
      id: 'script-default-1',
      title: fallbackTitle || 'Master Shooting Script #1',
      scriptText: trimmed,
      sceneNumber: 1,
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Serializes an array of ProjectScript items into a JSON string suitable for storage in ShootProject.notes
 */
export function serializeProjectScripts(scripts: ProjectScript[]): string {
  if (!scripts || scripts.length === 0) return '';
  return JSON.stringify(scripts, null, 2);
}

/**
 * Converts scripts into a clean human-readable summary text for captions or export
 */
export function formatScriptsAsSummaryText(scripts: ProjectScript[]): string {
  if (!scripts || scripts.length === 0) return '';
  if (scripts.length === 1 && !scripts[0].hook && !scripts[0].targetPlatform) {
    return scripts[0].scriptText;
  }
  return scripts
    .map((s, idx) => {
      const parts = [`🎬 SCRIPT ${idx + 1}: ${s.title.toUpperCase()}`];
      const meta = [];
      if (s.contentType) meta.push(`Type: ${s.contentType}`);
      if (s.targetPlatform) meta.push(`Platform: ${s.targetPlatform}`);
      if (s.duration) meta.push(`Duration: ${s.duration}`);
      if (meta.length > 0) parts.push(`[${meta.join(' | ')}]`);
      if (s.hook) parts.push(`🎣 Hook: ${s.hook}`);
      parts.push(`\n${s.scriptText}`);
      if (s.notes) parts.push(`\n📝 Notes: ${s.notes}`);
      return parts.join('\n');
    })
    .join('\n\n========================================\n\n');
}
