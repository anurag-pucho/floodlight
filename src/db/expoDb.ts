import { openDatabaseAsync } from 'expo-sqlite';
import type { Database, SqlParam } from './types';

/** expo-sqlite adapter for the Database port. Requires the native runtime (not usable in plain Jest). */
export async function openExpoDatabase(name = 'floodlight.db'): Promise<Database> {
  const sqlite = await openDatabaseAsync(name);
  return {
    exec: (sql: string) => sqlite.execAsync(sql),
    run: async (sql: string, params: SqlParam[] = []) => {
      await sqlite.runAsync(sql, params);
    },
    getAll: <T>(sql: string, params: SqlParam[] = []) => sqlite.getAllAsync<T>(sql, params),
    getFirst: <T>(sql: string, params: SqlParam[] = []) => sqlite.getFirstAsync<T>(sql, params),
  };
}
