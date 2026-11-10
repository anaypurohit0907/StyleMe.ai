/**
 * Minimal in-memory D1 mock — pattern-routes the queries the worker uses.
 * Good enough for API-surface integration tests without a network.
 */

type Row = Record<string, unknown>;

class Stmt {
  constructor(private db: MockD1, private sql: string, private params: unknown[]) {}

  private key() {
    return this.sql.replace(/\s+/g, " ").trim();
  }

  private users(): Row[] {
    return [...this.db.users.values()];
  }

  async first(): Promise<Row | null> {
    return this.all().then((r) => r.results[0] ?? null);
  }

  async all(): Promise<{ results: Row[] }> {
    const sql = this.key();
    const [p0] = this.params;
    if (sql.startsWith("SELECT * FROM users")) {
      const row = this.db.users.get(p0 as string) ?? null;
      return { results: row ? [row] : [] };
    }
    if (sql.startsWith("SELECT * FROM garments")) {
      return {
        results: [...this.db.garments.values()].filter((g) => g.user_id === p0),
      };
    }
    if (sql.startsWith("SELECT copy FROM tone_cache")) {
      const entry = this.db.toneCache.get(`${p0}:${this.params[1]}`) ?? null;
      return { results: entry ? [{ copy: entry.copy }] : [] };
    }
    return { results: [] };
  }

  async run(): Promise<void> {
    const sql = this.key();
    const p = this.params;
    if (sql.startsWith("INSERT INTO users")) {
      this.db.users.set(p[0] as string, {
        id: p[0],
        locale: p[1],
        onboarding: p[2],
        tone: p[3],
        prefs: p[4],
        explore_state: p[5],
        created_at: p[6],
      });
    } else if (sql.startsWith("UPDATE users SET onboarding")) {
      const u = this.db.users.get(p[2] as string);
      if (u) {
        if (p[0]) u.onboarding = p[0];
        if (p[1]) u.tone = p[1];
      }
    } else if (sql.startsWith("UPDATE users SET prefs")) {
      const u = this.db.users.get(p[2] as string);
      if (u) {
        u.prefs = p[0];
        u.explore_state = p[1];
      }
    } else if (sql.startsWith("INSERT INTO garments")) {
      this.db.garments.set(p[0] as string, {
        id: p[0],
        user_id: p[1],
        attrs: p[2],
        status: p[3],
        photo_ref: p[4],
        embedding: p[5],
        added_at: p[6],
        last_worn_at: p[7],
        corrections: p[8],
      });
    } else if (sql.startsWith("DELETE FROM garments")) {
      this.db.garments.delete(p[0] as string);
    } else if (sql.startsWith("UPDATE garments SET status")) {
      const g = this.db.garments.get(p[2] as string);
      if (g && g.user_id === p[3]) {
        g.status = p[0];
        if (p[1] === "washed") g.last_worn_at = null;
      }
    } else if (sql.startsWith("UPDATE garments SET last_worn_at")) {
      const g = this.db.garments.get(p[1] as string);
      if (g && g.user_id === p[2]) g.last_worn_at = p[0];
    } else if (sql.startsWith("INSERT INTO suggestions")) {
      this.db.suggestions.push({
        user_id: p[0],
        offered: p[1],
        picked: p[2],
        context: p[3],
        ts: p[4],
      });
    } else if (sql.startsWith("UPDATE suggestions SET picked")) {
      const last = [...this.db.suggestions].reverse().find((s) => s.user_id === p[1]);
      if (last) last.picked = p[0];
    } else if (sql.startsWith("INSERT INTO wear_log")) {
      this.db.wearLog.push({ user_id: p[0], garment_ids: p[1], worn_at: p[2] });
    } else if (sql.startsWith("INSERT INTO laundry_events")) {
      this.db.laundry.push({ user_id: p[0], garment_ids: p[1], event: p[2] });
    } else if (sql.startsWith("INSERT INTO tone_cache")) {
      this.db.toneCache.set(`${p[0]}:${p[1]}`, { copy: p[2] });
    }
  }
}

export class MockD1 {
  users = new Map<string, Row>();
  garments = new Map<string, Row>();
  suggestions: Row[] = [];
  wearLog: Row[] = [];
  laundry: Row[] = [];
  toneCache = new Map<string, { copy: string }>();

  prepare(sql: string) {
    return {
      bind: (...params: unknown[]) => new Stmt(this, sql, params),
    };
  }

  async batch(stmts: { run: () => Promise<void> }[]): Promise<unknown[]> {
    for (const s of stmts) await s.run();
    return [];
  }
}

export interface MockEnv {
  DB: MockD1;
  PHOTOS: { put: (key: string, val: string, meta?: unknown) => Promise<void> };
  JWT_SECRET: string;
}

export function makeEnv(): MockEnv {
  return {
    DB: new MockD1(),
    PHOTOS: {
      put: async () => {},
    },
    JWT_SECRET: "test-secret-0123456789-0123456789",
  };
}
