import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderStatus, SelectedItemsPayload, PackageId } from '../types';

/**
 * CLIENT-SIDE SUPABASE ARCHITECTURE (NETLIFY & PRODUCTION READY)
 *
 * Pada aplikasi Single Page Application (Vite / Netlify / Browser):
 * - Koneksi ke Supabase dilakukan langsung menggunakan `@supabase/supabase-js`.
 * - Kunci yang wajib digunakan adalah ANON / PUBLISHABLE KEY (sb_publishable_... atau token anon JWT).
 * - JANGAN gunakan SECRET KEY (sb_secret_...) di browser/Netlify karena Supabase secara eksplisit
 *   menolaknya dengan pesan "Forbidden use of secret API key in browser" (HTTP 401).
 *
 * Prioritas Kredensial:
 * 1. Custom settings di Browser localStorage (bisa diatur langsung di UI via modal tanpa redeploy).
 * 2. Environment variables Vite build: VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.
 * 3. Fallback default project URL jika key disediakan.
 */

const STORAGE_KEY_LOCAL_ORDERS = 'sneaker_orders_local_store';
const EVENT_ORDERS_UPDATED = 'sneaker_orders_updated';

// Fallback project URL dari konfigurasi awal
export const DEFAULT_SUPABASE_URL = 'https://akddalctutuhqhxbdoyi.supabase.co';

// Data pesanan contoh awal
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
 * Resolves current configured URL and Key directly from Vite env variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 */
export function getActiveSupabaseCredentials(): {
  url: string;
  key: string;
  isLive: boolean;
  isSecretKey: boolean;
} {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let activeUrl = envUrl;
  const activeKey = envKey;

  // Jika URL tidak diisi tetapi ada key, gunakan DEFAULT_SUPABASE_URL
  if (!activeUrl && activeKey) {
    activeUrl = DEFAULT_SUPABASE_URL;
  }

  const isSecret = activeKey.startsWith('sb_secret_');
  const isLive = Boolean(activeUrl && activeKey && !isSecret);

  return {
    url: activeUrl,
    key: activeKey,
    isLive,
    isSecretKey: isSecret,
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentClientKey = '';
let currentClientUrl = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getActiveSupabaseCredentials();

  if (!url || !key) {
    supabaseInstance = null;
    return null;
  }

  if (supabaseInstance && currentClientKey === key && currentClientUrl === url) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentClientKey = key;
    currentClientUrl = url;
  } catch (err) {
    console.warn('[Supabase Client] Gagal membuat instance Supabase client:', err);
    supabaseInstance = null;
  }

  return supabaseInstance;
}

/**
 * Tes koneksi ke Supabase untuk diagnostik
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  isSecretKeyError: boolean;
  count?: number;
}> {
  const { url, key, isSecretKey } = getActiveSupabaseCredentials();

  if (!url || !key) {
    return {
      success: false,
      message: 'URL atau Kunci API Supabase belum terpasang.',
      isSecretKeyError: false,
    };
  }

  if (isSecretKey) {
    return {
      success: false,
      message: 'Kunci bertipe Secret Key (sb_secret_...). Supabase menolak request dari browser dengan Secret Key. Harap gunakan Anon / Publishable Key.',
      isSecretKeyError: true,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Tidak dapat menginisialisasi client Supabase.',
      isSecretKeyError: false,
    };
  }

  try {
    const { data, error, count } = await client
      .from('orders')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      const isSecretErr = error.message?.includes('Forbidden use of secret API key') || (error as any).code === 'UNAUTHORIZED_INVALID_API_KEY_TYPE';
      return {
        success: false,
        message: error.message,
        isSecretKeyError: isSecretErr,
      };
    }

    return {
      success: true,
      message: `Terhubung ke Supabase! Total pesanan di tabel: ${count ?? (data ? data.length : 0)}`,
      isSecretKeyError: false,
      count: count ?? (data ? data.length : 0),
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isSecretErr = msg.includes('Forbidden use of secret API key');
    return {
      success: false,
      message: msg,
      isSecretKeyError: isSecretErr,
    };
  }
}

/**
 * Normalizes raw Supabase row into standard typed Order
 */
function normalizeOrderRow(row: any): Order {
  let selected = row.selected_items;
  while (typeof selected === 'string') {
    try {
      selected = JSON.parse(selected);
    } catch {
      break;
    }
  }

  const fallbackPrice = Number(row.total_price) || 50000;
  const isHigherTier = fallbackPrice >= 90000;
  const defaultPackageId: PackageId = isHigherTier ? 'package_b' : 'package_a';

  const defaultPackage: SelectedItemsPayload = {
    package_id: defaultPackageId,
    package_name: isHigherTier ? 'Package B (Deep Clean)' : 'Package A (Basic Clean)',
    package_price: isHigherTier ? 90000 : 50000,
    express_delivery: false,
    express_price: 0,
  };

  const rawPkgId = selected && typeof selected === 'object' ? String(selected.package_id) : '';
  const resolvedPkgId: PackageId = rawPkgId === 'package_b' ? 'package_b' : (rawPkgId === 'package_a' ? 'package_a' : defaultPackageId);

  const safeSelected: SelectedItemsPayload = (selected && typeof selected === 'object') ? {
    package_id: resolvedPkgId,
    package_name: String(selected.package_name || defaultPackage.package_name),
    package_price: Number(selected.package_price) || defaultPackage.package_price,
    express_delivery: Boolean(selected.express_delivery),
    express_price: Number(selected.express_price) || 0,
  } : defaultPackage;

  return {
    id: String(row.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}`)),
    created_at: row.created_at || new Date().toISOString(),
    customer_name: String(row.customer_name || 'Pelanggan'),
    customer_phone: String(row.customer_phone || ''),
    selected_items: safeSelected,
    total_price: Number(row.total_price) || 0,
    status: (row.status === 'processed' ? 'processed' : 'pending') as OrderStatus,
  };
}

/**
 * Fetch orders directly from Supabase with fallback to localStorage
 */
export async function fetchOrders(): Promise<{
  orders: Order[];
  source: 'supabase' | 'local';
  error?: string;
  isSecretKeyError?: boolean;
}> {
  const { isSecretKey } = getActiveSupabaseCredentials();
  if (isSecretKey) {
    return {
      orders: getLocalOrders(),
      source: 'local',
      error: 'Forbidden use of secret API key in browser. Harap ganti dengan Publishable / Anon Key di menu Database.',
      isSecretKeyError: true,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      orders: getLocalOrders(),
      source: 'local',
      error: 'Kredensial Supabase belum dikonfigurasi. Klik tombol Database di atas untuk menghubungkan.',
    };
  }

  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Client] Fetch orders error:', error.message);
      const isSecretErr = error.message?.includes('Forbidden use of secret API key') || (error as any).code === 'UNAUTHORIZED_INVALID_API_KEY_TYPE';
      return {
        orders: getLocalOrders(),
        source: 'local',
        error: error.message,
        isSecretKeyError: isSecretErr,
      };
    }

    if (Array.isArray(data)) {
      const normalizedOrders = data.map(normalizeOrderRow);
      saveLocalOrders(normalizedOrders);
      return { orders: normalizedOrders, source: 'supabase' };
    }
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Supabase Client] Network fetch exception, using local orders:', msg);
    const isSecretErr = msg.includes('Forbidden use of secret API key');
    return {
      orders: getLocalOrders(),
      source: 'local',
      error: msg,
      isSecretKeyError: isSecretErr,
    };
  }

  return { orders: getLocalOrders(), source: 'local' };
}

/**
 * Subscribe to order updates via Supabase Realtime channel and window focus
 */
export function subscribeToOrders(onUpdate: () => void): (() => void) | null {
  const client = getSupabaseClient();
  let channel: any = null;

  if (client) {
    try {
      channel = client
        .channel('realtime:orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            onUpdate();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[Supabase Client] Realtime subscription error:', err);
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_LOCAL_ORDERS) {
      onUpdate();
    }
  };

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      onUpdate();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_ORDERS_UPDATED, handleCustomEvent);
    window.addEventListener('focus', onUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    if (channel && client) {
      try {
        client.removeChannel(channel);
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_ORDERS_UPDATED, handleCustomEvent);
      window.removeEventListener('focus', onUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

/**
 * Insert a new order directly to Supabase from the client
 */
export async function insertOrder(orderPayload: {
  customer_name: string;
  customer_phone: string;
  selected_items: SelectedItemsPayload;
  total_price: number;
}): Promise<{
  order: Order;
  source: 'supabase' | 'local';
  error?: string;
  isSecretKeyError?: boolean;
}> {
  const nowIso = new Date().toISOString();
  const { isSecretKey } = getActiveSupabaseCredentials();

  // Generated fallback local order
  const generatedId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'ord-' + Math.random().toString(36).substring(2, 11);

  const fallbackOrder: Order = {
    id: generatedId,
    created_at: nowIso,
    customer_name: orderPayload.customer_name,
    customer_phone: orderPayload.customer_phone,
    selected_items: orderPayload.selected_items,
    total_price: orderPayload.total_price,
    status: 'pending',
  };

  if (isSecretKey) {
    const current = getLocalOrders();
    saveLocalOrders([fallbackOrder, ...current]);
    return {
      order: fallbackOrder,
      source: 'local',
      error: 'Forbidden use of secret API key in browser. Gunakan Publishable / Anon Key.',
      isSecretKeyError: true,
    };
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('orders')
        .insert([
          {
            customer_name: orderPayload.customer_name,
            customer_phone: orderPayload.customer_phone,
            selected_items: orderPayload.selected_items,
            total_price: orderPayload.total_price,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (!error && data) {
        const insertedOrder = normalizeOrderRow(data);
        const current = getLocalOrders();
        saveLocalOrders([insertedOrder, ...current.filter((o) => o.id !== insertedOrder.id)]);
        return { order: insertedOrder, source: 'supabase' };
      } else if (error) {
        console.warn('[Supabase Client] Insert error, saving to local fallback:', error.message);
        const isSecretErr = error.message?.includes('Forbidden use of secret API key') || (error as any).code === 'UNAUTHORIZED_INVALID_API_KEY_TYPE';
        const current = getLocalOrders();
        saveLocalOrders([fallbackOrder, ...current]);
        return {
          order: fallbackOrder,
          source: 'local',
          error: error.message,
          isSecretKeyError: isSecretErr,
        };
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Supabase Client] Network exception inserting order, using local fallback:', msg);
      const isSecretErr = msg.includes('Forbidden use of secret API key');
      const current = getLocalOrders();
      saveLocalOrders([fallbackOrder, ...current]);
      return {
        order: fallbackOrder,
        source: 'local',
        error: msg,
        isSecretKeyError: isSecretErr,
      };
    }
  }

  // If no Supabase client configured
  const current = getLocalOrders();
  saveLocalOrders([fallbackOrder, ...current]);
  return {
    order: fallbackOrder,
    source: 'local',
    error: 'Kredensial Supabase belum terpasang. Order disimpan di penyimpanan lokal browser.',
  };
}

/**
 * Update order status ('pending' <-> 'processed') in Supabase & Local Cache
 */
export async function updateOrderStatusInDb(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const client = getSupabaseClient();
  const { isSecretKey } = getActiveSupabaseCredentials();

  if (client && !isSecretKey) {
    try {
      const { error } = await client
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (!error) {
        const current = getLocalOrders();
        const index = current.findIndex((o) => o.id === orderId);
        if (index !== -1) {
          current[index] = { ...current[index], status: newStatus };
          saveLocalOrders([...current]);
        }
        return true;
      } else {
        console.warn('[Supabase Client] Update status error:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Client] Update status network exception:', err);
    }
  }

  // Fallback local store update
  const current = getLocalOrders();
  const index = current.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    current[index] = { ...current[index], status: newStatus };
    saveLocalOrders([...current]);
  }
  return true;
}

/**
 * Seed initial sample orders directly to Supabase
 */
export async function seedDemoOrdersToSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  const { isSecretKey } = getActiveSupabaseCredentials();

  if (client && !isSecretKey) {
    try {
      const { error } = await client.from('orders').insert(
        INITIAL_DEMO_ORDERS.map((o) => ({
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          selected_items: o.selected_items,
          total_price: o.total_price,
          status: o.status,
        }))
      );
      if (!error) return true;
    } catch (err) {
      console.error('[Supabase Client] Failed to seed demo orders:', err);
    }
  }

  saveLocalOrders(INITIAL_DEMO_ORDERS);
  return true;
}
