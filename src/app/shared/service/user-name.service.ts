import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';

const USER_NAMES = 'identity/user/Names';
const MAX_IDS_PER_CALL = 100;

/**
 * Display names of user ids (created by, approved by, cash session owner...).
 * Ids requested in the same tick are batched into `GET identity/user/Names?ids=..` calls (max 100 each)
 * and cached for the app lifetime. `name(id)` is a sync signal read: it falls back to the id while
 * loading or when the user is unknown.
 */
@Injectable({ providedIn: 'root' })
export class UserNameService {
  /** id -> name (null = resolved but unknown: keep showing the id, do not ask again). */
  private readonly cache = signal(new Map<string, string | null>());
  private readonly requested = new Set<string>();
  private queue: string[] = [];
  private flushScheduled = false;

  constructor(private http: HttpClient) {}

  /** Name of the user (or the id itself while loading / unknown). Starts loading on first use. */
  name(id: string | null | undefined): string {
    if (id == null || id === '') return '';
    const key = String(id);
    const known = this.cache().get(key);
    if (known !== undefined) return known ?? key;
    this.request([key]);
    return key;
  }

  /** Queues ids to resolve (e.g. when a list arrives) so they come in one call. */
  request(ids: (string | null | undefined)[]): void {
    ids.forEach((raw) => {
      if (raw == null || raw === '') return;
      const id = String(raw);
      if (this.requested.has(id)) return;
      this.requested.add(id);
      this.queue.push(id);
    });
    if (this.queue.length && !this.flushScheduled) {
      this.flushScheduled = true;
      setTimeout(() => this.flush());
    }
  }

  /**
   * Resolves the ids (cached or fetched now) and emits a lookup `id -> name` (falls back to the id).
   * For screens that need the names before rendering (e.g. app-list-table columns).
   */
  resolve(ids: (string | null | undefined)[]): Observable<(id: string | null | undefined) => string> {
    const lookup = (id: string | null | undefined) => (id == null || id === '' ? '' : (this.cache().get(String(id)) ?? String(id)));
    const missing = [...new Set(ids.filter((i) => i != null && i !== '').map(String))].filter((id) => !this.cache().has(id));
    if (!missing.length) return of(lookup);
    const calls: Observable<void>[] = [];
    for (let i = 0; i < missing.length; i += MAX_IDS_PER_CALL) calls.push(this.load(missing.slice(i, i + MAX_IDS_PER_CALL)));
    missing.forEach((id) => this.requested.add(id));
    return forkJoin(calls).pipe(map(() => lookup));
  }

  private flush(): void {
    this.flushScheduled = false;
    const all = this.queue;
    this.queue = [];
    for (let i = 0; i < all.length; i += MAX_IDS_PER_CALL) this.fetch(all.slice(i, i + MAX_IDS_PER_CALL));
  }

  private fetch(ids: string[]): void {
    this.load(ids).subscribe();
  }

  /** One Names call; stores the result (unknown ids as null). Errors allow a retry later and never fail. */
  private load(ids: string[]): Observable<void> {
    const query = ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
    return this.http.get<{ id: string; name: string }[]>(`${env.apiUrl}${USER_NAMES}?${query}`).pipe(
      map((rows) => {
        const found = new Map((Array.isArray(rows) ? rows : []).map((r) => [String(r.id), r.name || null] as const));
        this.cache.update((m) => {
          const next = new Map(m);
          ids.forEach((id) => next.set(id, found.get(id) ?? null));
          return next;
        });
      }),
      catchError(() => {
        ids.forEach((id) => this.requested.delete(id));
        return of(undefined);
      })
    );
  }
}
