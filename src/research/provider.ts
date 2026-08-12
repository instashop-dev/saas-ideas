export interface ResearchQuery {
  query: string;
  ecosystem: string;
  sourceTypes?: string[];
  maxResults?: number;
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  sourceType: string;
  datePublished: string | null;
}

export interface ResearchProvider {
  name: string;
  search(query: ResearchQuery): Promise<ResearchResult[]>;
  isAvailable(): Promise<boolean>;
}

/**
 * Placeholder research provider that uses OpenRouter's web search capability
 * (if the model supports it) or falls back to a no-op provider.
 *
 * Replace or extend this with real search providers as needed.
 */
export function createResearchProvider(): ResearchProvider {
  return {
    name: 'openrouter-web',
    async search(_query: ResearchQuery): Promise<ResearchResult[]> {
      // In a production setup, this would use OpenRouter's web search plugin
      // or a separate search API. For the MVP, research is done by the LLM
      // agent itself using its training data + web access if available.
      return [];
    },
    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}

/**
 * Format search results as a string for inclusion in agent prompts.
 */
export function formatSearchResults(results: ResearchResult[]): string {
  if (results.length === 0) return 'No search results available.';

  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\nSource: ${r.source} (${r.sourceType})\nSnippet: ${r.snippet}\n`,
    )
    .join('\n---\n');
}
