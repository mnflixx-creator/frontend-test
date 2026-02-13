import { useInitializePlayer } from "@/components/player/hooks/useInitializePlayer";
import {
  CaptionListItem,
  PlayerMeta,
  PlayerStatus,
  playerStatus,
} from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { SourceSliceSource } from "@/stores/player/utils/qualities";
import { ProgressMediaItem, useProgressStore } from "@/stores/progress";

export interface Source {
  url: string;
  type: "hls" | "mp4";
}

function getProgress(
  items: Record<string, ProgressMediaItem>,
  meta: PlayerMeta | null,
): number {
  const item = items[meta?.tmdbId ?? ""];
  if (!item || !meta) return 0;
  if (meta.type === "movie") {
    if (!item.progress) return 0;
    return item.progress.watched;
  }

  const ep = item.episodes[meta.episode?.tmdbId ?? ""];
  if (!ep) return 0;
  return ep.progress.watched;
}

export function usePlayer() {
  const setStatus = usePlayerStore((s) => s.setStatus);
  const setMeta = usePlayerStore((s) => s.setMeta);
  const setSource = usePlayerStore((s) => s.setSource);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setSourceId = usePlayerStore((s) => s.setSourceId);
  const status = usePlayerStore((s) => s.status);
  const setEmbedId = usePlayerStore((s) => (s as any).setEmbedId);
  const shouldStartFromBeginning = usePlayerStore(
    (s) => s.interface.shouldStartFromBeginning,
  );
  const setShouldStartFromBeginning = usePlayerStore(
    (s) => s.setShouldStartFromBeginning,
  );
  const reset = usePlayerStore((s) => s.reset);
  const meta = usePlayerStore((s) => s.meta);
  const { init } = useInitializePlayer();
  const progressStore = useProgressStore();

  return {
    meta,
    reset,
    status,
    shouldStartFromBeginning,
    setShouldStartFromBeginning,
    setStatus,
    setMeta(m: PlayerMeta, newStatus?: PlayerStatus) {
      setMeta(m, newStatus);
    },

    playMedia(
      source: SourceSliceSource,
      captions: CaptionListItem[],
      providerId: string | null,
      chosenCaptionId: string | null,
      startAtOverride?: number,
    ) {
      const start = startAtOverride ?? getProgress(progressStore.items, meta);

      const chosen =
        chosenCaptionId ? captions.find((c) => c.id === chosenCaptionId) : null;

      // ✅ 1) load source first
      setEmbedId(null);
      setSource(source, captions, start);
      setSourceId(providerId);

      setStatus(playerStatus.PLAYING);
      init();

      // ✅ 2) apply caption AFTER tracks exist
      if (chosen) {
        const apply = () => {
          setCaption(chosen as any);

          usePlayerStore.setState((state: any) => {
            state.caption = state.caption ?? {};
            state.caption.selected = chosen;
            state.caption.enabled = true;
            state.caption.isEnabled = true;
            state.caption.showing = true;
            state.caption.mode = "showing";
          });
        };

        setTimeout(apply, 0);
        setTimeout(apply, 500);
      } else {
        setCaption(null as any);
        usePlayerStore.setState((state: any) => {
          state.caption = state.caption ?? {};
          state.caption.selected = null;
          state.caption.enabled = false;
          state.caption.isEnabled = false;
          state.caption.showing = false;
          state.caption.mode = "disabled";
        });
      }
    },
  };
}
