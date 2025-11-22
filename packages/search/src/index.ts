import { Client } from '@elastic/elasticsearch';

// ========== ELASTICSEARCH CLIENT ==========

let esClient: Client | null = null;

export interface ElasticsearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  cloud?: {
    id: string;
  };
}

/**
 * Initialize Elasticsearch client
 */
export function initElasticsearch(config: ElasticsearchConfig): Client {
  if (esClient) {
    return esClient;
  }

  esClient = new Client(config);

  console.log('Elasticsearch client initialized');
  return esClient;
}

/**
 * Get Elasticsearch client
 */
export function getElasticsearch(): Client {
  if (!esClient) {
    throw new Error('Elasticsearch not initialized. Call initElasticsearch() first.');
  }
  return esClient;
}

// ========== INDEX MANAGEMENT ==========

const ARENA_INDEX = 'betfun_arenas';
const USER_INDEX = 'betfun_users';
const TRANSACTION_INDEX = 'betfun_transactions';

/**
 * Create indexes with mappings
 */
export async function createIndexes(): Promise<void> {
  const client = getElasticsearch();

  // Arena index
  const arenaExists = await client.indices.exists({ index: ARENA_INDEX });
  if (!arenaExists) {
    await client.indices.create({
      index: ARENA_INDEX,
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text', analyzer: 'standard' },
            description: { type: 'text' },
            question: { type: 'text' },
            outcomes: { type: 'text' },
            tags: { type: 'keyword' },
            creator: { type: 'keyword' },
            pot: { type: 'long' },
            participantsCount: { type: 'integer' },
            entryFee: { type: 'long' },
            resolved: { type: 'boolean' },
            winnerOutcome: { type: 'integer' },
            endTime: { type: 'date' },
            createdAt: { type: 'date' },
            status: { type: 'keyword' },
            volume24h: { type: 'long' },
          },
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              arena_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'snowball'],
              },
            },
          },
        },
      },
    });
    console.log(`Index ${ARENA_INDEX} created`);
  }

  // User index
  const userExists = await client.indices.exists({ index: USER_INDEX });
  if (!userExists) {
    await client.indices.create({
      index: USER_INDEX,
      body: {
        mappings: {
          properties: {
            wallet: { type: 'keyword' },
            totalWagered: { type: 'long' },
            totalWon: { type: 'long' },
            winRate: { type: 'float' },
            arenaCount: { type: 'integer' },
            rank: { type: 'integer' },
            createdAt: { type: 'date' },
            lastActive: { type: 'date' },
          },
        },
      },
    });
    console.log(`Index ${USER_INDEX} created`);
  }

  // Transaction index
  const txExists = await client.indices.exists({ index: TRANSACTION_INDEX });
  if (!txExists) {
    await client.indices.create({
      index: TRANSACTION_INDEX,
      body: {
        mappings: {
          properties: {
            signature: { type: 'keyword' },
            type: { type: 'keyword' },
            arena: { type: 'keyword' },
            user: { type: 'keyword' },
            amount: { type: 'long' },
            timestamp: { type: 'date' },
            status: { type: 'keyword' },
          },
        },
      },
    });
    console.log(`Index ${TRANSACTION_INDEX} created`);
  }
}

// ========== ARENA SEARCH ==========

export interface ArenaSearchQuery {
  query?: string;
  tags?: string[];
  status?: 'active' | 'ended' | 'resolved';
  minPot?: number;
  maxPot?: number;
  creator?: string;
  sortBy?: 'relevance' | 'created' | 'pot' | 'participants';
  sortOrder?: 'asc' | 'desc';
  from?: number;
  size?: number;
}

export interface SearchResult<T> {
  hits: T[];
  total: number;
  took: number;
}

/**
 * Search arenas with advanced filtering
 */
export async function searchArenas(
  query: ArenaSearchQuery
): Promise<SearchResult<any>> {
  const client = getElasticsearch();

  const must: any[] = [];
  const filter: any[] = [];

  // Text search
  if (query.query) {
    must.push({
      multi_match: {
        query: query.query,
        fields: ['title^3', 'description^2', 'question', 'outcomes'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  // Status filter
  if (query.status) {
    filter.push({ term: { status: query.status } });
  }

  // Tags filter
  if (query.tags && query.tags.length > 0) {
    filter.push({ terms: { tags: query.tags } });
  }

  // Pot range
  if (query.minPot !== undefined || query.maxPot !== undefined) {
    const range: any = {};
    if (query.minPot !== undefined) range.gte = query.minPot;
    if (query.maxPot !== undefined) range.lte = query.maxPot;
    filter.push({ range: { pot: range } });
  }

  // Creator filter
  if (query.creator) {
    filter.push({ term: { creator: query.creator } });
  }

  // Sort
  let sort: any = [];
  if (query.sortBy === 'created') {
    sort = [{ createdAt: query.sortOrder || 'desc' }];
  } else if (query.sortBy === 'pot') {
    sort = [{ pot: query.sortOrder || 'desc' }];
  } else if (query.sortBy === 'participants') {
    sort = [{ participantsCount: query.sortOrder || 'desc' }];
  }

  const response = await client.search({
    index: ARENA_INDEX,
    body: {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
        },
      },
      sort: sort.length > 0 ? sort : undefined,
      from: query.from || 0,
      size: query.size || 20,
    },
  });

  return {
    hits: response.hits.hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    })),
    total: typeof response.hits.total === 'object' 
      ? response.hits.total.value 
      : response.hits.total,
    took: response.took,
  };
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const client = getElasticsearch();

  const response = await client.search({
    index: ARENA_INDEX,
    body: {
      suggest: {
        arena_suggest: {
          prefix: query,
          completion: {
            field: 'title.suggest',
            size: limit,
            skip_duplicates: true,
          },
        },
      },
    },
  });

  const suggestions = response.suggest?.arena_suggest?.[0]?.options || [];
  return suggestions.map((opt: any) => opt.text);
}

/**
 * Search similar arenas
 */
export async function searchSimilarArenas(
  arenaId: string,
  limit: number = 5
): Promise<any[]> {
  const client = getElasticsearch();

  const response = await client.search({
    index: ARENA_INDEX,
    body: {
      query: {
        more_like_this: {
          fields: ['title', 'description', 'tags'],
          like: [
            {
              _index: ARENA_INDEX,
              _id: arenaId,
            },
          ],
          min_term_freq: 1,
          max_query_terms: 12,
        },
      },
      size: limit,
    },
  });

  return response.hits.hits.map((hit: any) => ({
    id: hit._id,
    score: hit._score,
    ...hit._source,
  }));
}

// ========== INDEXING ==========

/**
 * Index an arena
 */
export async function indexArena(arena: any): Promise<void> {
  const client = getElasticsearch();

  await client.index({
    index: ARENA_INDEX,
    id: arena.id,
    body: arena,
    refresh: 'wait_for',
  });
}

/**
 * Bulk index arenas
 */
export async function bulkIndexArenas(arenas: any[]): Promise<void> {
  const client = getElasticsearch();

  const body = arenas.flatMap((arena) => [
    { index: { _index: ARENA_INDEX, _id: arena.id } },
    arena,
  ]);

  await client.bulk({ body, refresh: 'wait_for' });
}

/**
 * Update arena
 */
export async function updateArena(id: string, updates: any): Promise<void> {
  const client = getElasticsearch();

  await client.update({
    index: ARENA_INDEX,
    id,
    body: {
      doc: updates,
    },
    refresh: 'wait_for',
  });
}

/**
 * Delete arena from index
 */
export async function deleteArena(id: string): Promise<void> {
  const client = getElasticsearch();

  await client.delete({
    index: ARENA_INDEX,
    id,
  });
}

// ========== ANALYTICS ==========

/**
 * Get trending searches
 */
export async function getTrendingSearches(limit: number = 10): Promise<any[]> {
  const client = getElasticsearch();

  const response = await client.search({
    index: ARENA_INDEX,
    body: {
      size: 0,
      aggs: {
        popular_tags: {
          terms: {
            field: 'tags',
            size: limit,
            order: { _count: 'desc' },
          },
        },
      },
    },
  });

  return response.aggregations?.popular_tags?.buckets || [];
}

/**
 * Get search statistics
 */
export async function getSearchStats(): Promise<any> {
  const client = getElasticsearch();

  const response = await client.search({
    index: ARENA_INDEX,
    body: {
      size: 0,
      aggs: {
        total_arenas: {
          value_count: { field: 'id' },
        },
        active_arenas: {
          filter: { term: { status: 'active' } },
        },
        total_volume: {
          sum: { field: 'pot' },
        },
        avg_participants: {
          avg: { field: 'participantsCount' },
        },
      },
    },
  });

  return response.aggregations;
}

// ========== EXPORTS ==========

export default {
  initElasticsearch,
  getElasticsearch,
  createIndexes,
  searchArenas,
  getSearchSuggestions,
  searchSimilarArenas,
  indexArena,
  bulkIndexArenas,
  updateArena,
  deleteArena,
  getTrendingSearches,
  getSearchStats,
};

