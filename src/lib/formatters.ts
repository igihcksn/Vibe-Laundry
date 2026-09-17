import { ADMIN_WHATSAPP_NUMBER } from './constants';

/**
 * Formats a number as Indonesian Rupiah (e.g., 50000 -> "Rp50.000")
 */
export function formatIDR(amount: number): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(amount);
  return `Rp${formatted}`;
}

/**
 * Normalizes phone numbers to standard format for WhatsApp
 * Strips non-digits, converts leading '0' or '+62' to '62'
 */
export function cleanPhoneForWhatsApp(input: string): string {
  let cleaned = input.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Formats phone number for display (e.g., "0812-3456-7890")
 */
export function formatDisplayPhone(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('62')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return raw;
}

/**
 * Formats ISO timestamp to human readable Indonesian date/time
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date) + ' WIB';
  } catch {
    return isoString;
  }
}

/**
 * Generates the standardized WhatsApp plain text as specified in Section 5.1
 */
export function generateWhatsAppMessage(params: {
  id: string;
  customer_name: string;
  customer_phone: string;
  package_name: string;
  package_price: number;
  express_delivery: boolean;
  total_price: number;
}): string {
  const expressStr = params.express_delivery ? 'Ya' : 'Tidak';
  const formattedPkgPrice = formatIDR(params.package_price).replace('Rp', '');
  const formattedTotalPrice = formatIDR(params.total_price).replace('Rp', '');

  return [
    'Halo Admin, saya ingin konfirmasi order cuci sepatu:',
    '',
    `- Order ID: ${params.id}`,
    `- Nama: ${params.customer_name}`,
    `- No. WhatsApp: ${params.customer_phone}`,
    `- Paket: ${params.package_name} (Rp${formattedPkgPrice})`,
    `- Express Delivery: ${expressStr}`,
    `- Total Estimasi: Rp${formattedTotalPrice}`,
    '',
    'Mohon info jadwal pick-up / drop-off sepatu saya. Terima kasih!'
  ].join('\n');
}

/**
 * Constructs the WhatsApp deep link
 */
export function buildWhatsAppUrl(message: string, adminNumber = ADMIN_WHATSAPP_NUMBER): string {
  return `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
}
