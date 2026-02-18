/**
 * Icecast/SHOUTcast metadata parser (stub/mock).
 * Parses ICY metadata from stream headers.
 */

export interface IcecastMetadata {
  streamTitle: string | null;
  streamUrl: string | null;
  bitrate: number | null;
  listeners: number | null;
}

export class IcecastMetadataParser {
  /**
   * Fetch and parse metadata from an Icecast stream status endpoint.
   * Returns mock data until real stream URLs are configured.
   */
  async getMetadata(_streamUrl: string): Promise<IcecastMetadata> {
    // TODO: Implement real Icecast metadata parsing
    // Typically: GET {streamUrl}/status-json.xsl or parse ICY headers
    return {
      streamTitle: 'WCCG 104.5 FM - Charlotte Gospel',
      streamUrl: null,
      bitrate: 128,
      listeners: Math.floor(Math.random() * 200) + 50,
    };
  }
}
