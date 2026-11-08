export interface ApiRespuesta<T> {
  status: 'ok';
  data: T;
  sessionToken?: string;
}
