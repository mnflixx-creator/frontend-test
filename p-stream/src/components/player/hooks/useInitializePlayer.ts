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
  const enabled = useSubtitleStore((s) => s.enabled);
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

      // Try to select previously used language if enabled
      selectLastUsedLanguageIfEnabled();

      // If subtitles are not already enabled and captions are available, auto-select first caption
      // This ensures subtitles are visible by default when tracks are present
      if (!enabled && captionList.length > 0) {
        // Try to select English subtitle first, otherwise select the first available
        const englishCaption = captionList.find((c) => c.language === "en");
        if (englishCaption) {
          selectCaptionById(englishCaption.id);
        } else {
          selectCaptionById(captionList[0].id);
        }
      }
    }
  }, [
    sourceIdentifier,
    selectLastUsedLanguageIfEnabled,
    captionList,
    enabled,
    selectCaptionById,
  ]);
}
