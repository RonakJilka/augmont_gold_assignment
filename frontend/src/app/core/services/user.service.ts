import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';
import { User } from '../models/user';

export interface UserCreate {
  email: string;
  password: string;
}

export interface UserUpdate {
  email?: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/users`;

  me(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`);
  }

  updateMe(body: UserUpdate): Observable<User> {
    return this.http.patch<User>(`${this.base}/me`, body);
  }

  list(): Observable<User[] | { data: User[] }> {
    return this.http.get<User[] | { data: User[] }>(this.base);
  }

  create(body: UserCreate): Observable<User> {
    return this.http.post<User>(this.base, body);
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  update(id: number, body: UserUpdate): Observable<User> {
    return this.http.patch<User>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
