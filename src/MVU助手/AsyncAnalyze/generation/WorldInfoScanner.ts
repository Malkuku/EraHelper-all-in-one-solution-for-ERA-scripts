import { GenerationContext, RawEntry, TimedState } from './GenerationHost';
import { scanNativeWorldInfo } from './NativeWorldInfo.js';

export type ScanResult = {
  worldInfoBefore: string; worldInfoAfter: string;
  EMEntries: { position: number; content: string }[];
  WIDepthEntries: { depth: number; entries: string[]; role: number }[];
  ANBeforeEntries: string[]; ANAfterEntries: string[]; outletEntries: Record<string, string[]>;
  allActivatedEntries: Set<RawEntry>; timedState: TimedState;
};
export async function scanWorldInfo(context: GenerationContext, entries: RawEntry[]): Promise<ScanResult> {
  const character = context.ctx.characters[context.ctx.characterId as any];
  const data = character?.data ?? {};
  return scanNativeWorldInfo({
    entries, scan: context.task.scan, history: context.scanHistory, maxContext: context.preset.openai_max_context,
    floor: context.identity.messageId + 1, timedState: context.timedState,
    context: { tagMap: { ...(context.ctx.tagMap ?? {}), ...(character?.avatar ? { [character.avatar]: context.ctx.tagMap?.[character.avatar] ?? [] } : {}) } }, characterFilename: character?.avatar?.replace(/\.[^.]+$/, '') ?? '',
    characterTagKey: character?.avatar,
    signal: context.controller.signal, substitute: (text: string) => context.ctx.substituteParams(text), countTokens: context.tokenCounter.count,
    scanData: {
      trigger: 'normal', personaDescription: context.ctx.chatMetadata.persona_description ?? '',
      characterDescription: data.description ?? character?.description ?? '', characterPersonality: data.personality ?? character?.personality ?? '',
      characterDepthPrompt: data.extensions?.depth_prompt?.prompt ?? '', scenario: data.scenario ?? character?.scenario ?? '', creatorNotes: data.creator_notes ?? '',
    },
  }) as Promise<ScanResult>;
}
