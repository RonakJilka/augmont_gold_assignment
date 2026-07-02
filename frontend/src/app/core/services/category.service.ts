import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';
import { Category } from '../models/category';
import { Paginated } from '../models/paginated';

export interface CategoryListParams {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/categories`;

  list(params: CategoryListParams = {}): Observable<Paginated<Category>> {
    let hp = new HttpParams();
    if (params.search) hp = hp.set('search', params.search);
    if (params.page != null) hp = hp.set('page', params.page);
    if (params.limit != null) hp = hp.set('limit', params.limit);
    return this.http.get<Paginated<Category>>(this.base, { params: hp });
  }

  get(uniqueId: string): Observable<Category> {
    return this.http.get<Category>(`${this.base}/${uniqueId}`);
  }

  create(body: { name: string }): Observable<Category> {
    return this.http.post<Category>(this.base, body);
  }

  update(uniqueId: string, body: { name: string }): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/${uniqueId}`, body);
  }

  remove(uniqueId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${uniqueId}`);
  }
}
