import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { downloadCaption } from "@/backend/helpers/subs";
import { makeVideoElementDisplayInterface } from "@/components/player/display/base";
import { convertSubtitlesToObjectUrl } from "@/components/player/utils/captions";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

import { useInitializeSource } from "../hooks/useInitializePlayer";

// Delay to ensure DOM is fully updated before activating tracks
const TRACK_ACTIVATION_DELAY_MS = 100;

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

  // Download ONLY the selected caption (prevents 10+ requests -> 503)
  useEffect(() => {
    let isMounted = true;

    const caption = availableCaptions.find((c) => c.id === selectedCaptionId);

    // if nothing selected or selected is HLS, do nothing
    if (!caption || caption.hls) return;

    // if already downloaded, do nothing
    if (captionDataMap[caption.id]) return;

    (async () => {
      try {
        const srtData = await downloadCaption(caption);
        const objectUrl = convertSubtitlesToObjectUrl(srtData);

        if (isMounted) {
          setCaptionDataMap((prev) => ({
            ...prev,
            [caption.id]: objectUrl,
          }));
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        console.error(`Failed to download caption ${caption.id}:`, error);
        if (isMounted) {
          setCaptionDataMap((prev) => ({ ...prev, [caption.id]: null }));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
    // captionDataMap intentionally excluded from deps to avoid re-downloading on map updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaptionId, availableCaptions]);

  const captionDataMapRef = useRef<Record<string, string | null>>({});

  useEffect(() => {
    captionDataMapRef.current = captionDataMap;
  }, [captionDataMap]);

  useEffect(() => {
    return () => {
      Object.values(captionDataMapRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

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
    if (!shouldUseNativeTrack) return; // ✅ add this line
    if (!videoEl.current) return;

    const videoElement = videoEl.current;
    const textTracks = videoElement.textTracks;

    if (!textTracks) return;

    // Get all track elements
    const trackElements = videoElement.querySelectorAll<HTMLTrackElement>(
      "track[data-caption-id]",
    );

    trackElements.forEach((trackElement) => {
      const captionId = trackElement.getAttribute("data-caption-id");

      if (!captionId) return;

      const isSelected = captionId === selectedCaptionId;
      const track = trackElement.track;

      // Set track mode based on selection and settings
      if (isSelected && shouldUseNativeTrack) {
        track.mode = "showing";
      } else {
        track.mode = "disabled";
      }
    });
  }, [
    shouldUseNativeTrack,
    selectedCaptionId,
    subtitleTracks,
    availableCaptions,
  ]);

  // Ensure selected track is activated after tracks are fully loaded
  useEffect(() => {
    if (!shouldUseNativeTrack) return;
    if (!videoEl.current) return;
    if (!selectedCaptionId) return;

    const videoElement = videoEl.current;
    let hasActivated = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Function to activate the selected track
    const activateSelectedTrack = () => {
      // Prevent redundant calls
      if (hasActivated) return;
      hasActivated = true;

      // Clear timeout since activation is happening now
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const trackElements = videoElement.querySelectorAll<HTMLTrackElement>(
        "track[data-caption-id]",
      );

      trackElements.forEach((trackElement) => {
        const captionId = trackElement.getAttribute("data-caption-id");
        const track = trackElement.track;

        if (captionId === selectedCaptionId) {
          // Set mode to showing to ensure the track is displayed
          track.mode = "showing";
        } else {
          track.mode = "disabled";
        }
      });
    };

    // Listen for when video metadata is loaded (preferred approach)
    const handleLoadedMetadata = () => {
      activateSelectedTrack();
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);

    // Fallback timeout in case loadedmetadata doesn't fire
    timeoutId = setTimeout(activateSelectedTrack, TRACK_ACTIVATION_DELAY_MS);

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [shouldUseNativeTrack, selectedCaptionId, subtitleTracks]);

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
      {shouldUseNativeTrack ? subtitleTracks : null}
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
