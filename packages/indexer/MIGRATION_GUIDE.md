# Database Migration Guide

## Running Phase 3 Migrations

### Step 1: Run Index Migration

```bash
# Connect to your Supabase project
cd packages/indexer/supabase

# Run migration via Supabase CLI
supabase db push

# Or manually via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of migrations/002_add_indexes.sql
# 3. Run the SQL
```

### Step 2: Verify Indexes

```sql
-- Check if indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('arenas', 'participants', 'processed_transactions')
ORDER BY tablename, indexname;
```

### Step 3: Verify Performance

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM arenas
WHERE resolved = false
  AND end_time > NOW()
ORDER BY pot DESC
LIMIT 20;
```

### Expected Results

- Query should use indexes (see "Index Scan" in EXPLAIN output)
- Query time should be < 50ms for typical datasets
- All indexes should be listed in pg_indexes

---

## Rollback (if needed)

```sql
-- Drop indexes (if migration needs to be rolled back)
DROP INDEX IF EXISTS idx_arenas_creator_wallet;
DROP INDEX IF EXISTS idx_arenas_created_at_desc;
DROP INDEX IF EXISTS idx_arenas_resolved_end_time;
DROP INDEX IF EXISTS idx_arenas_pot_desc;
DROP INDEX IF EXISTS idx_arenas_resolved;
DROP INDEX IF EXISTS idx_arenas_arena_account;
DROP INDEX IF EXISTS idx_arenas_tags;
DROP INDEX IF EXISTS idx_arenas_active;

DROP INDEX IF EXISTS idx_participants_arena_id;
DROP INDEX IF EXISTS idx_participants_wallet;
DROP INDEX IF EXISTS idx_participants_arena_wallet;
DROP INDEX IF EXISTS idx_participants_joined_at_desc;
DROP INDEX IF EXISTS idx_participants_claimed;
DROP INDEX IF EXISTS idx_participants_tx_signature;

DROP INDEX IF EXISTS idx_processed_transactions_signature;
DROP INDEX IF EXISTS idx_processed_transactions_processed_at;

-- Drop processed_transactions table
DROP TABLE IF EXISTS processed_transactions;
```

---

## Monitoring Index Usage

```sql
-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Maintenance

### Vacuum and Analyze

Run periodically to maintain index performance:

```sql
VACUUM ANALYZE arenas;
VACUUM ANALYZE participants;
VACUUM ANALYZE processed_transactions;
```

### Monitor Index Size

```sql
SELECT
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  indexrelname AS index_name
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

