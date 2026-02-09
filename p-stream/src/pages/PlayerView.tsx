import { getZentlifyStreams } from "@/services/streaming";

export function RealPlayerView() {
  // Usual hooks and state
  // ...

  const [streams, setStreams] = useState([]);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    async function fetchStreams() {
      if (id) {
        const data = await getZentlifyStreams(id);
        // Map Zentlify streams to the interface expected by player components
        const formattedStreams = data.streams.map(stream => ({
          file: stream.file || stream.url,
          type: stream.type || (stream.file?.includes('.m3u8') ? 'hls' : 'mp4'),
          quality: stream.quality || stream.title || stream.name,
          provider: stream.provider || stream.name || "zentlify"
        }));
        setStreams(formattedStreams);
      }
    }
    fetchStreams();
  }, [id]);

  // Pass streams to the modular player UI (example, check your exact player part signature)
  return (
    <PlayerPart streams={streams} />
  );
}