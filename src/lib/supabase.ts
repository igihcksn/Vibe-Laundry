import { Order, OrderStatus, SelectedItemsPayload, PackageId } from '../types';

/**
 * PURE CLIENT-SIDE ORDER STORAGE
 * 
 * Sesuai instruksi, aplikasi berjalan 100% di sisi klien (Client-Side)
 * dan TIDAK LAGI MENGAKSES API "rest/v1/orders" dari browser.
 * 
 * Seluruh data pemesanan dikelola dan dipersistensikan secara lokal (localStorage)
 * dengan sinkronisasi reaktif in-memory dan event listeners, bebas dari masalah
 * CORS atau "Forbidden use of secret API key in browser".
 */

const STORAGE_KEY_LOCAL_ORDERS = 'sneaker_orders_local_store';
const EVENT_ORDERS_UPDATED = 'sneaker_orders_updated';

// Data pesanan contoh awal untuk demonstrasi aplikasi
export const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    customer_name: 'Budi Santoso',
    customer_phone: '081234567890',
    selected_items: {
      package_id: 'package_b',
      package_name: 'Package B (Deep Clean)',
      package_price: 90000,
      express_delivery: true,
      express_price: 25000,
    },
    total_price: 115000,
    status: 'processed',
  },
  {
    id: 'e25dc98a-12fa-4891-9651-7f94b8c9d012',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    customer_name: 'Dina Maharani',
    customer_phone: '085798765432',
    selected_items: {
      package_id: 'package_a',
      package_name: 'Package A (Basic Clean)',
      package_price: 50000,
      express_delivery: false,
      express_price: 0,
    },
    total_price: 50000,
    status: 'pending',
  },
];

function notifyOrderListeners() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_ORDERS_UPDATED));
  }
}

// Ambil riwayat order dari penyimpanan lokal
export function getLocalOrders(): Order[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_ORDERS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LOCAL_ORDERS, JSON.stringify(INITIAL_DEMO_ORDERS));
      return INITIAL_DEMO_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_ORDERS;
  } catch {
    return INITIAL_DEMO_ORDERS;
  }
}

// Simpan riwayat order ke penyimpanan lokal
export function saveLocalOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_ORDERS, JSON.stringify(orders));
    notifyOrderListeners();
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Status kredensial client-side
 */
export function getActiveSupabaseCredentials(): {
  url: string;
  key: string;
  isCustom: boolean;
  isLive: boolean;
  isSecretKey: boolean;
} {
  return {
    url: 'Client-Side Local Storage',
    key: '',
    isCustom: false,
    isLive: false,
    isSecretKey: false,
  };
}

export function getSupabaseClient(): null {
  // Tidak lagi menginstansiasi Supabase client yang memanggil rest/v1/orders
  return null;
}

export function setCustomSupabaseCredentials(): void {
  // Mode murni client-side
}

export function resetCustomSupabaseCredentials(): void {
  // Mode murni client-side
}

/**
 * Mengambil daftar order murni dari client-side storage (tanpa HTTP rest/v1/orders)
 */
export async function fetchOrders(): Promise<{ orders: Order[]; source: 'local' }> {
  const orders = getLocalOrders();
  return { orders, source: 'local' };
}

/**
 * Listener reaktif untuk update perubahan data order antar komponen/tab
 */
export function subscribeToOrders(onUpdate: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_LOCAL_ORDERS) {
      onUpdate();
    }
  };

  const handleCustomEvent = () => {
    onUpdate();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_ORDERS_UPDATED, handleCustomEvent);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_ORDERS_UPDATED, handleCustomEvent);
    }
  };
}

/**
 * Menyimpan order baru langsung ke client-side storage
 */
export async function insertOrder(orderPayload: {
  customer_name: string;
  customer_phone: string;
  selected_items: SelectedItemsPayload;
  total_price: number;
}): Promise<{ order: Order; source: 'local' }> {
  const generatedId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'ord-' + Math.random().toString(36).substring(2, 11);

  const newOrder: Order = {
    id: generatedId,
    created_at: new Date().toISOString(),
    customer_name: orderPayload.customer_name,
    customer_phone: orderPayload.customer_phone,
    selected_items: orderPayload.selected_items,
    total_price: orderPayload.total_price,
    status: 'pending',
  };

  const current = getLocalOrders();
  const updated = [newOrder, ...current.filter((o) => o.id !== newOrder.id)];
  saveLocalOrders(updated);

  return { order: newOrder, source: 'local' };
}

/**
 * Memperbarui status pesanan ('pending' <-> 'processed') di client-side storage
 */
export async function updateOrderStatusInDb(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const current = getLocalOrders();
  const index = current.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    current[index] = { ...current[index], status: newStatus };
    saveLocalOrders([...current]);
    return true;
  }
  return false;
}

/**
 * Seed data pesanan sampel ke penyimpanan lokal
 */
export async function seedDemoOrdersToSupabase(): Promise<boolean> {
  saveLocalOrders(INITIAL_DEMO_ORDERS);
  return true;
}
