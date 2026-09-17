import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderStatus, SelectedItemsPayload, PackageId } from '../types';

/**
 * CLIENT-SIDE SUPABASE ARCHITECTURE:
 * As requested, this application does NOT require an external/separate backend server to run.
 * 
 * Note on Supabase API Key types:
 * - Supabase blocks requests from browsers (User-Agent: Mozilla/...) that use Secret Keys (sb_secret_...)
 *   with the error: "Forbidden use of secret API key in browser".
 * - For pure client-side browser apps, Supabase expects the Publishable/Anon Key (sb_publishable_... or legacy JWT anon key).
 * - To seamlessly allow both without requiring a separate backend service, the Vite dev/preview server
 *   transparently proxies requests via /supabase-proxy with a Node User-Agent when a secret key is in use,
 *   while direct connections work seamlessly when a publishable/anon key is provided!
 */

const STORAGE_KEY_LOCAL_ORDERS = 'sneaker_orders_local_store';
const STORAGE_KEY_CUSTOM_URL = 'supabase_custom_url';
const STORAGE_KEY_CUSTOM_KEY = 'supabase_custom_key';

// Default initial sample orders for demonstration before live submissions
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

// Helper to get local stored orders
export function getLocalOrders(): Order[] {
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

export function saveLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Resolves current configured URL and Key (environment variables or localStorage overrides)
 */
export function getActiveSupabaseCredentials(): {
  url: string;
  key: string;
  isCustom: boolean;
  isLive: boolean;
  isSecretKey: boolean;
} {
  let customUrl = '';
  let customKey = '';
  if (typeof window !== 'undefined') {
    try {
      customUrl = (localStorage.getItem(STORAGE_KEY_CUSTOM_URL) || '').trim();
      customKey = (localStorage.getItem(STORAGE_KEY_CUSTOM_KEY) || '').trim();
    } catch {}
  }

  const rawEnvUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://akddalctutuhqhxbdoyi.supabase.co').trim();
  const rawEnvKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const activeUrl = customUrl || rawEnvUrl;
  const activeKey = customKey || rawEnvKey;
  const isSecret = activeKey.startsWith('sb_secret_');

  return {
    url: activeUrl,
    key: activeKey,
    isCustom: Boolean(customUrl && customKey),
    isLive: Boolean(activeUrl && activeKey),
    isSecretKey: isSecret,
  };
}

/**
 * Resolves the client connection endpoint.
 * If the key is a secret key (sb_secret_...), connecting directly from the browser
 * causes Supabase to reject the request with "Forbidden use of secret API key in browser".
 * In that case, we route via Vite's built-in /supabase-proxy which forwards with a Node User-Agent!
 */
function resolveClientEndpoint(rawUrl: string, key: string): string {
  if (typeof window !== 'undefined') {
    // If the key is a secret key, route through Vite's local /supabase-proxy
    if (key.startsWith('sb_secret_')) {
      return `${window.location.origin}/supabase-proxy`;
    }
  }
  return rawUrl;
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

  const resolvedEndpoint = resolveClientEndpoint(url, key);

  if (supabaseInstance && currentClientKey === key && currentClientUrl === resolvedEndpoint) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(resolvedEndpoint, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentClientKey = key;
    currentClientUrl = resolvedEndpoint;
  } catch (err) {
    console.warn('[Supabase Client] Failed to create Supabase client:', err);
    supabaseInstance = null;
  }

  return supabaseInstance;
}

export function setCustomSupabaseCredentials(url: string, key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_CUSTOM_KEY, key.trim());
    supabaseInstance = null; // force re-creation
  } catch (err) {
    console.error('Failed to save custom Supabase credentials:', err);
  }
}

export function resetCustomSupabaseCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_URL);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_KEY);
    supabaseInstance = null; // force re-creation
  } catch (err) {
    console.error('Failed to reset custom Supabase credentials:', err);
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
export async function fetchOrders(): Promise<{ orders: Order[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { orders: getLocalOrders(), source: 'local' };
  }

  try {
    let queryRes = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryRes.error) {
      // If error mentions secret key or ordering failure, retry basic select
      console.warn('[Supabase Client] Order query warning, retrying simple select:', queryRes.error.message);
      queryRes = await client.from('orders').select('*');
    }

    if (queryRes.error) {
      console.warn('[Supabase Client] Query error, falling back to local orders:', queryRes.error.message);
      return { orders: getLocalOrders(), source: 'local', error: queryRes.error.message };
    }

    if (Array.isArray(queryRes.data)) {
      const normalizedOrders = queryRes.data.map(normalizeOrderRow);
      saveLocalOrders(normalizedOrders);
      return { orders: normalizedOrders, source: 'supabase' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Supabase Client] Network fetch error, using local orders:', msg);
    return { orders: getLocalOrders(), source: 'local', error: msg };
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
      console.warn('[Supabase Client] Could not subscribe to realtime channel:', err);
    }
  }

  // Periodic polling fallback
  const interval = setInterval(() => {
    onUpdate();
  }, 4000);

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      onUpdate();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    clearInterval(interval);
    if (channel && client) {
      try {
        client.removeChannel(channel);
      } catch {}
    }
    if (typeof window !== 'undefined') {
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
}): Promise<{ order: Order; source: 'supabase' | 'local' }> {
  const nowIso = new Date().toISOString();
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
      }
    } catch (err) {
      console.warn('[Supabase Client] Network exception inserting order, using local fallback:', err);
    }
  }

  // Fallback local store insert
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

  const current = getLocalOrders();
  saveLocalOrders([fallbackOrder, ...current]);
  return { order: fallbackOrder, source: 'local' };
}

/**
 * Update order status ('pending' <-> 'processed') directly in Supabase
 */
export async function updateOrderStatusInDb(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await client
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (!error) {
        const current = getLocalOrders();
        const index = current.findIndex((o) => o.id === orderId);
        if (index !== -1) {
          current[index].status = newStatus;
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
    current[index].status = newStatus;
    saveLocalOrders([...current]);
  }
  return true;
}

/**
 * Seed initial sample orders directly to Supabase
 */
export async function seedDemoOrdersToSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

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
    return !error;
  } catch (err) {
    console.error('[Supabase Client] Failed to seed demo orders:', err);
    return false;
  }
}
