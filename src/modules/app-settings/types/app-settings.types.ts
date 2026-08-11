/**
 * Tipos de retorno de los métodos de AppSettingsService.
 * Se exportan aquí para que el controller y otros consumidores
 * puedan anotar sus tipos sin recurrir a ReturnType<> verboso.
 */

/**
 * Configuraciones públicas expuestas al frontend sin autenticación.
 * No contiene datos internos como márgenes de tipo de cambio.
 *
 * `companyBankAccounts` es un JSON serializado como string en la BD;
 * el servicio lo parsea a un array de objetos o devuelve [] si está vacío.
 */
export interface PublicSettingsDto {
  whatsappNumber: string;
  phoneNumber: string | null;
  address: string | null;
  schedule1: string | null;
  schedule2: string | null;
  footerDescription: string | null;
  logoUrl: string | null;
  /** Cuentas bancarias de la empresa para recibir transferencias. */
  companyBankAccounts: CompanyBankAccount[];
}

/**
 * Todas las configuraciones del sistema (solo para admins).
 * Extiende las públicas e incluye márgenes internos.
 */
export interface AdminSettingsDto extends PublicSettingsDto {
  exchangeRateBuyMargin: number;
  exchangeRateSellMargin: number;
}

/**
 * Estructura de una cuenta bancaria de la empresa.
 */
export interface CompanyBankAccount {
  /** Nombre del banco (ej: "BCP", "Interbank"). */
  bank: string;
  /** Tipo de moneda: "PEN" | "USD". */
  currency: 'PEN' | 'USD';
  /** Número de cuenta bancaria. */
  accountNumber: string;
  /** Número de cuenta interbancaria (CCI), opcional. */
  cci?: string;
  /** Nombre del titular de la cuenta. */
  accountHolder: string;
}
