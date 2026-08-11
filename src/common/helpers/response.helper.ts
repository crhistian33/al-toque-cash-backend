import { ApiResponse, PaginatedMeta } from '../interfaces/api-response.interface';

/**
 * Construye una respuesta exitosa estándar (200 / 201).
 *
 * @param data    - Payload a devolver.
 * @param message - Mensaje descriptivo (por defecto 'OK').
 */
export function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return { success: true, message, data };
}

/**
 * Construye una respuesta de creación exitosa (201).
 *
 * @param data    - Recurso recién creado.
 * @param message - Mensaje descriptivo (por defecto 'Creado correctamente').
 */
export function created<T>(data: T, message = 'Creado correctamente'): ApiResponse<T> {
  return { success: true, message, data };
}

/**
 * Construye una respuesta paginada estándar.
 *
 * @param data  - Array de elementos de la página actual.
 * @param meta  - Metadatos de paginación.
 * @param message - Mensaje descriptivo (por defecto 'OK').
 */
export function paginated<T>(
  data: T[],
  meta: PaginatedMeta,
  message = 'OK',
): ApiResponse<T[]> {
  return { success: true, message, data, meta };
}
