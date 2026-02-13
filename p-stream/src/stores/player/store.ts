import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { createCastingSlice } from "@/stores/player/slices/casting";
import { createDisplaySlice } from "@/stores/player/slices/display";
import { createInterfaceSlice } from "@/stores/player/slices/interface";
import { createPlayingSlice } from "@/stores/player/slices/playing";
import { createProgressSlice } from "@/stores/player/slices/progress";
import { createSourceSlice } from "@/stores/player/slices/source";
import { createThumbnailSlice } from "@/stores/player/slices/thumbnails";
import { AllSlices } from "@/stores/player/slices/types";

// ✅ ADDED
export type CustomSource = { id: string; label?: string };

export interface CustomSourceSlice {
  customSources: CustomSource[];
  selectedCustomSourceId: string | null;

  playingCustomSourceId: string | null;
  setPlayingCustomSourceId: (id: string | null) => void;

  // ✅ ADD
  preferredCaptionLang: string | null;
  setPreferredCaptionLang: (lang: string | null) => void;

  setCustomSources: (sources: CustomSource[]) => void;
  setSelectedCustomSourceId: (id: string | null) => void;
}

export const usePlayerStore = create(
  // ✅ CHANGED: extend AllSlices with CustomSourceSlice
  immer<AllSlices & CustomSourceSlice>((set, get, api) => ({
    ...createInterfaceSlice(set, get, api),
    ...createProgressSlice(set, get, api),
    ...createPlayingSlice(set, get, api),
    ...createSourceSlice(set, get, api),
    ...createDisplaySlice(set, get, api),
    ...createCastingSlice(set, get, api),
    ...createThumbnailSlice(set, get, api),

    // ✅ ADDED: MNFLIX server list state
    customSources: [],
    selectedCustomSourceId: null,
    playingCustomSourceId: null,

    // ✅ ADD
    preferredCaptionLang: "mn",


    setCustomSources: (sources) =>
      set((state) => {
        state.customSources = sources;

        // ✅ prefer flux as default if available
        const hasFlux = sources.some((s) => s.id === "flux");

        // if current selection missing OR we want flux default
        if (hasFlux) {
          state.selectedCustomSourceId = "flux";
        } else if (
          !state.selectedCustomSourceId ||
          !sources.some((s) => s.id === state.selectedCustomSourceId)
        ) {
          state.selectedCustomSourceId = sources[0]?.id ?? null;
        }
      }),

    setSelectedCustomSourceId: (id) =>
      set((state) => {
        state.selectedCustomSourceId = id;
      }),

    setPlayingCustomSourceId: (id) =>
      set((state) => {
        state.playingCustomSourceId = id;
      }),
    
    // ✅ ADD
    setPreferredCaptionLang: (lang) =>
      set((state) => {
        state.preferredCaptionLang = lang;
      }),
  })),
);
