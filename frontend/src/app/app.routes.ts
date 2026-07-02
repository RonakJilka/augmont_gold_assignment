import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  { path: 'products', canActivate: [authGuard], loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent) },
  { path: 'products/new', canActivate: [authGuard], loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent) },
  { path: 'products/:uniqueId/edit', canActivate: [authGuard], loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent) },
  { path: 'categories', canActivate: [authGuard], loadComponent: () => import('./features/categories/category-list.component').then(m => m.CategoryListComponent) },
  { path: 'bulk-upload', canActivate: [authGuard], loadComponent: () => import('./features/bulk-upload/bulk-upload.component').then(m => m.BulkUploadComponent) },
  { path: 'reports', canActivate: [authGuard], loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'users', canActivate: [authGuard], loadComponent: () => import('./features/users/user-list.component').then(m => m.UserListComponent) },
  { path: '**', redirectTo: 'products' }
];
