import type { ZentlifyStream } from "@/services/streaming";

/**
 * Provider order preference for MNFLIX
 */
const PROVIDER_ORDER = ["lush", "flow", "sonata", "zen", "breeze", "nova"];

/**
 * Sorts providers according to the preferred order
 */
export function sortProvidersByPreference(
  streams: ZentlifyStream[],
): ZentlifyStream[] {
  return [...streams].sort((a, b) => {
    const indexA = PROVIDER_ORDER.indexOf(a.provider.toLowerCase());
    const indexB = PROVIDER_ORDER.indexOf(b.provider.toLowerCase());

    // If both providers are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one is in the order list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither is in the order list, maintain original order
    return 0;
  });
}
