/**
 * Metadatos opcionales para respuestas paginadas.
 */
export interface PaginatedMeta {
  /** Página actual (1-indexed). */
  page: number;
  /** Elementos por página. */
  limit: number;
  /** Total de elementos en la colección completa. */
  total: number;
  /** Total de páginas disponibles. */
  totalPages: number;
}

/**
 * Sobre estándar para todas las respuestas de la API.
 *
 * @typeParam T - Tipo del payload de `data`.
 *
 * @example
 * // Respuesta simple
 * { success: true, message: 'OK', data: { ... } }
 *
 * @example
 * // Respuesta paginada
 * { success: true, message: 'OK', data: [...], meta: { page, limit, total, totalPages } }
 */
export interface ApiResponse<T = unknown> {
  /** Indica si la operación fue exitosa. */
  success: boolean;
  /** Mensaje descriptivo del resultado. */
  message: string;
  /** Payload de la respuesta. */
  data: T;
  /** Metadatos de paginación (solo presente en colecciones paginadas). */
  meta?: PaginatedMeta;
}
