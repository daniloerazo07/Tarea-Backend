import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

@Injectable({ providedIn: 'root' })
export class ApiSession {
  // Sólo vive en memoria; se elimina al recargar o al expirar la sesión.
  token: string | null = null;
}

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  const base = inject(API_BASE_URL).replace(/\/$/, '');
  const session = inject(ApiSession);
  const headers: Record<string, string> = session.token ? { Authorization: `Bearer ${session.token}` } : {};
  return next(request.clone({ url: base + request.url.slice(4), setHeaders: headers })).pipe(
    catchError(error => {
      if (error.status === 401) session.token = null;
      return throwError(() => error);
    }),
  );
};
