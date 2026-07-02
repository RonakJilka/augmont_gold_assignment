import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, startWith, map } from 'rxjs';
import { API_BASE } from './api-config';
import { Job } from '../models/job';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/jobs`;

  get(id: string): Observable<Job> {
    return this.http.get<{ job: Job }>(`${this.base}/${id}`).pipe(map(r => r.job));
  }

  downloadUrl(id: string): string {
    return `${this.base}/${id}/download`;
  }

  errorsUrl(id: string): string {
    return `${this.base}/${id}/errors.csv`;
  }

  // Poll a job every 2s and emit until it reaches a terminal state (inclusive of the final tick).
  // We use `takeWhile(..., true)` so the completed/failed emission is delivered to the subscriber.
  poll(jobId: string): Observable<Job> {
    return interval(2000).pipe(
      startWith(0),
      switchMap(() => this.get(jobId)),
      takeWhile(j => j.status !== 'completed' && j.status !== 'failed', true)
    );
  }
}
