/**
 * SQLite Database Core Engine using sql.js + IndexedDB persistence
 * Guarantees 100% offline-first local storage on the iPhone/browser.
 */
import initSqlJs, { Database, QueryExecResult } from 'sql.js';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';

const IDB_NAME = 't_personal_finance_db';
const IDB_STORE = 'sqlite_binary';
const IDB_KEY = 'latest_db_bytes';

let dbInstance: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

// Subscribers for reactive database change notifications
const changeListeners = new Set<() => void>();

export function subscribeToDatabaseChanges(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function notifyDatabaseChanged(): void {
  // Persist binary immediately on change
  saveDatabaseToIndexedDB().catch(console.error);
  changeListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in change listener:', e);
    }
  });
}

/**
 * Open IndexedDB store
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load saved binary database from IndexedDB
 */
async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        if (req.result && req.result instanceof Uint8Array) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, starting fresh database:', err);
    return null;
  }
}

/**
 * Save current binary database to IndexedDB
 */
export async function saveDatabaseToIndexedDB(): Promise<void> {
  if (!dbInstance) return;
  try {
    const binary = dbInstance.export();
    const idb = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(binary, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save SQLite binary to IndexedDB:', err);
  }
}

/**
 * Initialize SQLite database engine
 */
export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => `https://sql.js.org/dist/sql-wasm.wasm`,
    });

    const savedBinary = await loadDatabaseFromIndexedDB();
    let db: Database;

    if (savedBinary && savedBinary.length > 0) {
      try {
        db = new SQL.Database(savedBinary);
      } catch (err) {
        console.warn('Failed to restore saved binary, creating new DB:', err);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON;");

    // Execute schema (idempotent CREATE TABLE IF NOT EXISTS)
    db.exec(SCHEMA_SQL);

    // Seed defaults if empty
    seedDatabase(db);

    dbInstance = db;
    await saveDatabaseToIndexedDB();
    return db;
  })();

  return initPromise;
}

/**
 * Map sql.js QueryExecResult into typed JavaScript objects
 */
function mapResultsToObjects<T>(execResult: QueryExecResult[]): T[] {
  if (!execResult || execResult.length === 0) return [];
  const { columns, values } = execResult[0];
  return values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
}

/**
 * Run a SELECT query and return typed array of objects
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

/**
 * Run a SELECT query and return the first matching object or null
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const list = await query<T>(sql, params);
  return list.length > 0 ? list[0] : null;
}

/**
 * Execute INSERT, UPDATE, or DELETE query and notify listeners
 */
export async function run(
  sql: string,
  params: any[] = []
): Promise<{ lastInsertRowid: number; changes: number }> {
  const db = await getDatabase();
  db.run(sql, params);

  // Retrieve last insert ID and change count
  const idResult = db.exec("SELECT last_insert_rowid() as id, changes() as changes;");
  let lastInsertRowid = 0;
  let changes = 0;
  if (idResult.length > 0 && idResult[0].values.length > 0) {
    lastInsertRowid = idResult[0].values[0][0] as number;
    changes = idResult[0].values[0][1] as number;
  }

  notifyDatabaseChanged();
  return { lastInsertRowid, changes };
}

/**
 * Execute multiple statements in an atomic SQLite transaction
 */
export async function runTransaction<T>(callback: (db: Database) => Promise<T> | T): Promise<T> {
  const db = await getDatabase();
  db.run("BEGIN TRANSACTION;");
  try {
    const result = await callback(db);
    db.run("COMMIT;");
    notifyDatabaseChanged();
    return result;
  } catch (error) {
    try {
      db.run("ROLLBACK;");
    } catch (rbErr) {
      console.error("Rollback failed:", rbErr);
    }
    throw error;
  }
}

/**
 * Export raw SQLite binary
 */
export async function exportDatabaseBinary(): Promise<Uint8Array> {
  const db = await getDatabase();
  return db.export();
}

/**
 * Replace entire database with imported binary
 */
export async function importDatabaseBinary(binary: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => `https://sql.js.org/dist/sql-wasm.wasm`,
  });
  const newDb = new SQL.Database(binary);
  newDb.run("PRAGMA foreign_keys = ON;");
  dbInstance = newDb;
  await saveDatabaseToIndexedDB();
  notifyDatabaseChanged();
}
