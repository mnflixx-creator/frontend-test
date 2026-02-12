import { useCallback, useEffect, useMemo, useRef } from "react";

import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";
import { useVolumeStore } from "@/stores/volume";

import { useCaptions } from "./useCaptions";

export function useInitializePlayer() {
  const display = usePlayerStore((s) => s.display);
  const volume = useVolumeStore((s) => s.volume);

  const init = useCallback(() => {
    display?.setVolume(volume);
  }, [display, volume]);

  return {
    init,
  };
}

export function useInitializeSource() {
  const source = usePlayerStore((s) => s.source);
  const captionList = usePlayerStore((s) => s.captionList);
  const sourceIdentifier = useMemo(
    () => (source ? JSON.stringify(source) : null),
    [source],
  );
  const { selectLastUsedLanguageIfEnabled, selectCaptionById } = useCaptions();

  // Only select subtitles on initial load, not when source changes
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (sourceIdentifier && !hasInitializedRef.current) {
      hasInitializedRef.current = true;

      // Try to select previously used language if enabled, then auto-select if needed
      (async () => {
        // First, try to restore previously enabled language
        await selectLastUsedLanguageIfEnabled();

        // After restoration attempt, check if subtitles are now enabled
        // If not, and captions are available, auto-select first caption
        // This ensures subtitles are visible by default when tracks are present
        const isEnabled = useSubtitleStore.getState().enabled;
        if (!isEnabled && captionList.length > 0) {
          // Try to select English subtitle first, otherwise select the first available
          const englishCaption = captionList.find((c) => c.language === "en");
          if (englishCaption) {
            await selectCaptionById(englishCaption.id);
          } else {
            await selectCaptionById(captionList[0].id);
          }
        }
      })();
    }
  }, [
    sourceIdentifier,
    selectLastUsedLanguageIfEnabled,
    captionList,
    selectCaptionById,
  ]);
}
