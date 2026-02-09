import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { useSkipTracking } from "@/components/player/hooks/useSkipTracking";
import { Transition } from "@/components/utils/Transition";
import { usePlayerStore } from "@/stores/player/store";

function shouldShowSkipButton(
  currentTime: number,
  skipTime?: number | null,
): "always" | "hover" | "none" {
  if (typeof skipTime !== "number") return "none";

  // Only show during the first 10 seconds of the intro section
  if (currentTime >= 0 && currentTime < skipTime) {
    if (currentTime <= 10) return "always";
    return "hover";
  }

  return "none";
}

function Button(props: {
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={classNames(
        "font-bold rounded h-10 w-40 scale-95 hover:scale-100 transition-all duration-200",
        props.className,
      )}
      type="button"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function SkipIntroButton(props: {
  controlsShowing: boolean;
  skipTime?: number | null;
  inControl: boolean;
}) {
  const time = usePlayerStore((s) => s.progress.time);
  const status = usePlayerStore((s) => s.status);
  const display = usePlayerStore((s) => s.display);
  const meta = usePlayerStore((s) => s.meta);
  const { addSkipEvent } = useSkipTracking(20);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSkipDataRef = useRef<{
    startTime: number;
    endTime: number;
    skipDuration: number;
  } | null>(null);
  const showingState = shouldShowSkipButton(time, props.skipTime);
  const animation = showingState === "hover" ? "slide-up" : "fade";
  let bottom = "bottom-[calc(6rem+env(safe-area-inset-bottom))]";
  if (showingState === "always") {
    bottom = props.controlsShowing
      ? bottom
      : "bottom-[calc(3rem+env(safe-area-inset-bottom))]";
  }

  const { t } = useTranslation();

  const reportSkip = useCallback(
    (confidence: number) => {
      if (!pendingSkipDataRef.current) return;

      const { startTime, endTime, skipDuration } = pendingSkipDataRef.current;

      addSkipEvent({
        startTime,
        endTime,
        skipDuration,
        confidence,
        meta: meta
          ? {
              title:
                meta.type === "show" && meta.episode
                  ? `${meta.title} - S${meta.season?.number || 0}E${meta.episode.number || 0}`
                  : meta.title,
              type: meta.type === "movie" ? "Movie" : "TV Show",
              tmdbId: meta.tmdbId,
              seasonNumber: meta.season?.number,
              episodeNumber: meta.episode?.number,
            }
          : undefined,
      });

      // eslint-disable-next-line no-console
      console.log(
        `Skip intro reported: ${skipDuration}s total, confidence: ${confidence}`,
      );

      // Clean up
      pendingSkipDataRef.current = null;
      setShowFeedback(false);
      setFeedbackSubmitted(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [addSkipEvent, meta],
  );

  const handleThumbsUp = useCallback(() => {
    reportSkip(0.95);
  }, [reportSkip]);

  const handleThumbsDown = useCallback(() => {
    reportSkip(0.7);
  }, [reportSkip]);

  const handleSkip = useCallback(() => {
    if (typeof props.skipTime === "number" && display) {
      const startTime = time;
      const endTime = props.skipTime;
      const skipDuration = endTime - startTime;

      display.setTime(props.skipTime);

      // Store skip data temporarily
      pendingSkipDataRef.current = {
        startTime,
        endTime,
        skipDuration,
      };

      // Show feedback UI
      setShowFeedback(true);
      setFeedbackSubmitted(false);

      // Start 10-second timeout
      timeoutRef.current = setTimeout(() => {
        // Hide component immediately to prevent flicker
        setShowFeedback(false);
        setFeedbackSubmitted(true);
        reportSkip(0.8);
      }, 10000);

      // eslint-disable-next-line no-console
      console.log(`Skip intro button used: ${skipDuration}s total`);
    }
  }, [props.skipTime, display, time, reportSkip]);

  // Reset feedback state when content changes
  useEffect(() => {
    setShowFeedback(false);
    setFeedbackSubmitted(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingSkipDataRef.current = null;
  }, [meta?.tmdbId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!props.inControl) return null;

  let show = false;
  // Don't show anything if feedback has been submitted
  if (feedbackSubmitted) {
    show = false;
  } else if (showFeedback) {
    // Always show feedback UI when active
    show = true;
  } else if (showingState === "always") {
    // Show skip button when always visible
    show = true;
  } else if (showingState === "hover" && props.controlsShowing) {
    // Show skip button on hover when controls are showing
    show = true;
  }
  if (status !== "playing") show = false;

  return (
    <Transition
      animation={animation}
      show={show}
      className="absolute right-[calc(3rem+env(safe-area-inset-right))] bottom-0"
    >
      <div
        className={classNames([
          "absolute bottom-0 right-0 transition-[bottom] duration-200 flex items-center",
          showFeedback ? "flex-col space-y-2" : "space-x-3",
          bottom,
        ])}
      >
        {showFeedback ? (
          <>
            <div className="text-sm font-medium text-white">
              {t("player.skipIntro.feedback")}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleThumbsUp}
                className={classNames(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  "bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText",
                  "scale-95 hover:scale-100 transition-all duration-200",
                )}
                aria-label="Thumbs up"
              >
                <Icon className="text-xl" icon={Icons.THUMBS_UP} />
              </button>
              <button
                type="button"
                onClick={handleThumbsDown}
                className={classNames(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  "bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText",
                  "scale-95 hover:scale-100 transition-all duration-200",
                )}
                aria-label="Thumbs down"
              >
                <Icon className="text-xl" icon={Icons.THUMBS_DOWN} />
              </button>
            </div>
          </>
        ) : (
          <Button
            onClick={handleSkip}
            className="bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText flex justify-center items-center"
          >
            <Icon className="text-xl mr-1" icon={Icons.SKIP_EPISODE} />
            {t("player.skipIntro.skip")}
          </Button>
        )}
      </div>
    </Transition>
  );
}
