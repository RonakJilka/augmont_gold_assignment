import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';
import { Product } from '../models/product';
import { Paginated } from '../models/paginated';

export interface ProductListParams {
  page?: number;
  limit?: number;
  sort?: 'price:asc' | 'price:desc';
  search?: string;
  categoryUniqueId?: string;
}

export interface ReportParams {
  format: 'csv' | 'xlsx';
  search?: string;
  categoryUniqueId?: string;
  sort?: 'price:asc' | 'price:desc';
}

export interface JobAccepted {
  jobId: string;
  statusUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/products`;

  list(params: ProductListParams = {}): Observable<Paginated<Product>> {
    let hp = new HttpParams();
    if (params.page != null) hp = hp.set('page', params.page);
    if (params.limit != null) hp = hp.set('limit', params.limit);
    if (params.sort) hp = hp.set('sort', params.sort);
    if (params.search) hp = hp.set('search', params.search);
    if (params.categoryUniqueId) hp = hp.set('categoryUniqueId', params.categoryUniqueId);
    return this.http.get<Paginated<Product>>(this.base, { params: hp });
  }

  get(uniqueId: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${uniqueId}`);
  }

  create(body: FormData): Observable<Product> {
    return this.http.post<Product>(this.base, body);
  }

  update(uniqueId: string, body: FormData): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/${uniqueId}`, body);
  }

  remove(uniqueId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${uniqueId}`);
  }

  bulkUpload(file: File): Observable<JobAccepted> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<JobAccepted>(`${this.base}/bulk-upload`, fd);
  }

  createReport(body: ReportParams): Observable<JobAccepted> {
    return this.http.post<JobAccepted>(`${API_BASE}/reports/products`, body);
  }
}
