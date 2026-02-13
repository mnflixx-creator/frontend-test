import { useCallback, useEffect, useMemo, useRef } from "react";

import { usePlayerStore } from "@/stores/player/store";
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

  // ✅ run again when source changes (episode / refresh)
  const lastSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sourceIdentifier) return;
    if (lastSourceRef.current === sourceIdentifier) return;

    lastSourceRef.current = sourceIdentifier;

    (async () => {
      await selectLastUsedLanguageIfEnabled();

      if (!captionList.length) return;

      const preferred =
        usePlayerStore.getState().preferredCaptionLang ?? "mn";

      const chosen =
        captionList.find((c) => c.language === preferred) ||
        captionList.find((c) => c.language === "mn") ||
        captionList.find((c) => c.language === "en") ||
        captionList[0];

      if (!chosen) return;

      // ✅ run twice to beat the "tracks not ready yet" race
      await selectCaptionById(chosen.id);
      setTimeout(() => {
        selectCaptionById(chosen.id);
      }, 400);
    })();
  }, [sourceIdentifier, captionList, selectLastUsedLanguageIfEnabled, selectCaptionById]);
}
