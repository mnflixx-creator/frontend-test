import { useEffect, useState } from "react";

// import { proxiedFetch } from "@/backend/helpers/fetch";
import { proxiedFetch } from "@/backend/helpers/fetch";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";
import { usePreferencesStore } from "@/stores/preferences";
import { getTurnstileToken } from "@/utils/turnstile";

// Thanks Nemo for this API
const FED_SKIPS_BASE_URL = "https://fed-skips.pstream.mov";
// const VELORA_BASE_URL = "https://veloratv.ru/api/intro-end/confirmed";
const INTRODB_BASE_URL = "https://api.introdb.app/intro";
const MAX_RETRIES = 3;

export function useSkipTime() {
  const { playerMeta: meta } = usePlayerMeta();
  const [skiptime, setSkiptime] = useState<number | null>(null);
  const febboxKey = usePreferencesStore((s) => s.febboxKey);

  useEffect(() => {
    // const fetchVeloraSkipTime = async (): Promise<number | null> => {
    //   if (!meta?.tmdbId) return null;

    //   try {
    //     let apiUrl = `${VELORA_BASE_URL}?tmdbId=${meta.tmdbId}`;
    //     if (meta.type !== "movie") {
    //       apiUrl += `&season=${meta.season?.number}&episode=${meta.episode?.number}`;
    //     }
    //     const data = await proxiedFetch(apiUrl);

    //     if (data.introSkippable && typeof data.introEnd === "number") {
    //       return data.introEnd;
    //     }

    //     return null;
    //   } catch (error) {
    //     console.error("Error fetching velora skip time:", error);
    //     return null;
    //   }
    // };

    const fetchFedSkipsTime = async (retries = 0): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;
      if (!conf().ALLOW_FEBBOX_KEY) return null;
      if (!febboxKey) return null;

      try {
        const apiUrl = `${FED_SKIPS_BASE_URL}/${meta.imdbId}/${meta.season?.number}/${meta.episode?.number}`;

        const turnstileToken = await getTurnstileToken(
          "0x4AAAAAAB6ocCCpurfWRZyC",
        );
        if (!turnstileToken) return null;

        const response = await fetch(apiUrl, {
          headers: {
            "cf-turnstile-response": turnstileToken,
          },
        });

        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES) {
            return fetchFedSkipsTime(retries + 1);
          }
          throw new Error("Fed-skips API request failed");
        }

        const data = await response.json();

        const parseSkipTime = (timeStr: string | undefined): number | null => {
          if (!timeStr || typeof timeStr !== "string") return null;
          const match = timeStr.match(/^(\d+)s$/);
          if (!match) return null;
          return parseInt(match[1], 10);
        };

        const skipTime = parseSkipTime(data.introSkipTime);

        return skipTime;
      } catch (error) {
        console.error("Error fetching fed-skips time:", error);
        return null;
      }
    };

    const fetchIntroDBTime = async (): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;

      try {
        const apiUrl = `${INTRODB_BASE_URL}?imdb_id=${meta.imdbId}&season=${meta.season?.number}&episode=${meta.episode?.number}`;

        const data = await proxiedFetch(apiUrl);

        if (data && typeof data.end_ms === "number") {
          // Convert milliseconds to seconds
          return Math.floor(data.end_ms / 1000);
        }

        return null;
      } catch (error) {
        console.error("Error fetching IntroDB time:", error);
        return null;
      }
    };

    const fetchSkipTime = async (): Promise<void> => {
      // If user has febbox key, prioritize Fed-skips (better quality)
      if (febboxKey) {
        const fedSkipsTime = await fetchFedSkipsTime();
        if (fedSkipsTime !== null) {
          setSkiptime(fedSkipsTime);
          return;
        }
      }

      // Fall back to IntroDB API (available to all users)
      const introDBTime = await fetchIntroDBTime();
      setSkiptime(introDBTime);
    };

    fetchSkipTime();
  }, [
    meta?.tmdbId,
    meta?.imdbId,
    meta?.type,
    meta?.season?.number,
    meta?.episode?.number,
    febboxKey,
  ]);

  return skiptime;
}
