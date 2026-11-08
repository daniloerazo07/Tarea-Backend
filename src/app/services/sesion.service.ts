import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs';
import { Usuario } from '../models/usuario';
import { ApiRespuesta } from '../models/api';
import { ApiSession } from './api-config';

@Injectable({ providedIn: 'root' })
export class SesionService {
  constructor(private http: HttpClient, private session: ApiSession) {}

  iniciar() {
    return this.http.post<ApiRespuesta<Usuario>>('/api/sesion', {}).pipe(
      tap(respuesta => this.session.token = respuesta.sessionToken ?? null),
      map(respuesta => respuesta.data)
    );
  }
}
