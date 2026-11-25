import { Pipe, PipeTransform, inject } from '@angular/core';
import { UserNameService } from '@shared/service/user-name.service';

/**
 * `{{ row.createdBy | userName }}` renders the user's display name, batching and caching the lookups
 * (UserNameService). Shows the id while loading or when unknown. Impure so it re-renders when the
 * name arrives (it only reads a cached signal).
 */
@Pipe({ name: 'userName', pure: false })
export class UserNamePipe implements PipeTransform {
  private readonly users = inject(UserNameService);

  transform(id: string | null | undefined, fallback = ''): string {
    if (id == null || id === '') return fallback;
    return this.users.name(id);
  }
}
