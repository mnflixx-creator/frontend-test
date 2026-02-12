import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { downloadCaption } from "@/backend/helpers/subs";
import { makeVideoElementDisplayInterface } from "@/components/player/display/base";
import { convertSubtitlesToObjectUrl } from "@/components/player/utils/captions";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

import { useInitializeSource } from "../hooks/useInitializePlayer";

// initialize display interface
function useDisplayInterface() {
  const display = usePlayerStore((s) => s.display);
  const setDisplay = usePlayerStore((s) => s.setDisplay);

  const displayRef = useRef(display);
  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!displayRef.current) {
      const newDisplay = makeVideoElementDisplayInterface();
      displayRef.current = newDisplay;
      setDisplay(newDisplay);
    }
    return () => {
      if (displayRef.current) {
        displayRef.current = null;
        setDisplay(null);
      }
    };
  }, [setDisplay]);
}

export function useShouldShowVideoElement() {
  const status = usePlayerStore((s) => s.status);

  if (status !== playerStatus.PLAYING) return false;
  return true;
}

function VideoElement() {
  const videoEl = useRef<HTMLVideoElement>(null);
  const display = usePlayerStore((s) => s.display);
  const selectedCaptionId = usePlayerStore((s) => s.caption.selected?.id);
  const captionList = usePlayerStore((s) => s.captionList);
  const getHlsCaptionList = usePlayerStore((s) => s.display?.getCaptionList);
  const source = usePlayerStore((s) => s.source);
  const enableNativeSubtitles = usePreferencesStore(
    (s) => s.enableNativeSubtitles,
  );

  // Get combined caption list (regular + HLS captions)
  const availableCaptions = useMemo(
    () =>
      captionList.length !== 0 ? captionList : (getHlsCaptionList?.() ?? []),
    [captionList, getHlsCaptionList],
  );

  // State to store downloaded caption data with object URLs
  const [captionDataMap, setCaptionDataMap] = useState<
    Record<string, string | null>
  >({});

  // Download and convert all available captions to VTT object URLs
  useEffect(() => {
    const downloadAllCaptions = async () => {
      const newCaptionDataMap: Record<string, string | null> = {};

      for (const caption of availableCaptions) {
        // Skip HLS captions as they're handled differently
        if (caption.hls) {
          newCaptionDataMap[caption.id] = null;
          continue;
        }

        try {
          // Download the caption as SRT
          const srtData = await downloadCaption(caption);
          // Convert to VTT object URL for use in track element
          const objectUrl = convertSubtitlesToObjectUrl(srtData);
          newCaptionDataMap[caption.id] = objectUrl;
        } catch (error) {
          console.error(`Failed to download caption ${caption.id}:`, error);
          newCaptionDataMap[caption.id] = null;
        }
      }

      setCaptionDataMap(newCaptionDataMap);
    };

    if (availableCaptions.length > 0) {
      downloadAllCaptions();
    } else {
      // Clear caption data if no captions available
      setCaptionDataMap({});
    }

    // Cleanup: revoke all object URLs when component unmounts or captions change
    return () => {
      // Use the previous state to clean up
      setCaptionDataMap((prevMap) => {
        Object.values(prevMap).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        return {};
      });
    };
  }, [availableCaptions]);

  // Use native tracks when the setting is enabled
  const shouldUseNativeTrack = enableNativeSubtitles && source !== null;

  // report video element to display interface
  useEffect(() => {
    if (display && videoEl.current) {
      display.processVideoElement(videoEl.current);
    }
  }, [display, videoEl]);

  // Render all available captions as track elements
  const subtitleTracks = useMemo(() => {
    const tracks: ReactNode[] = [];

    for (const caption of availableCaptions) {
      // Skip HLS captions (handled by the player internally)
      if (caption.hls) continue;

      const objectUrl = captionDataMap[caption.id];
      if (!objectUrl) continue;

      const isSelected = caption.id === selectedCaptionId;
      const label = caption.display || caption.language;

      tracks.push(
        <track
          key={caption.id}
          data-caption-id={caption.id}
          label={label}
          kind="subtitles"
          srcLang={caption.language}
          src={objectUrl}
          // Set default for the selected caption
          default={isSelected}
        />,
      );
    }

    return tracks;
  }, [availableCaptions, captionDataMap, selectedCaptionId]);

  // Control track visibility based on setting
  useEffect(() => {
    if (!videoEl.current) return;

    const videoElement = videoEl.current;
    const textTracks = videoElement.textTracks;

    if (!textTracks) return;

    // Get all track elements
    const trackElements = videoElement.querySelectorAll<HTMLTrackElement>(
      "track[data-caption-id]",
    );

    for (let i = 0; i < trackElements.length; i += 1) {
      const trackElement = trackElements[i];
      const captionId = trackElement.getAttribute("data-caption-id");

      if (!captionId) continue;

      const isSelected = captionId === selectedCaptionId;
      const track = trackElement.track;

      // Set track mode based on selection and settings
      if (isSelected && shouldUseNativeTrack) {
        track.mode = "showing";
      } else {
        track.mode = "disabled";
      }
    }
  }, [
    shouldUseNativeTrack,
    selectedCaptionId,
    subtitleTracks,
    availableCaptions,
  ]);

  return (
    <video
      id="video-element"
      className="absolute inset-0 w-full h-screen bg-black"
      autoPlay
      playsInline
      ref={videoEl}
      preload="metadata"
      onContextMenu={(e) => e.preventDefault()}
    >
      {subtitleTracks}
    </video>
  );
}

export function VideoContainer() {
  const show = useShouldShowVideoElement();
  useDisplayInterface();
  useInitializeSource();

  if (!show) return null;
  return <VideoElement />;
}
