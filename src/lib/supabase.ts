import { Order, OrderStatus, SelectedItemsPayload, PackageId } from '../types';

const STORAGE_KEY_LOCAL_ORDERS = 'sneaker_orders_local_store';

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

// Server status cache
const serverStatusCache = {
  isLive: true,
  url: 'https://akddalctutuhqhxbdoyi.supabase.co',
};

export function getActiveSupabaseCredentials(): { url: string; key: string; isLive: boolean } {
  return {
    url: serverStatusCache.url,
    key: 'Protected on backend server',
    isLive: serverStatusCache.isLive,
  };
}

export function setCustomSupabaseCredentials(_url: string, _key: string): void {
  // Credentials are securely maintained by the backend server
}

export function getSupabaseClient(): null {
  // Browser avoids instantiating Supabase secret client directly
  return null;
}

/**
 * Fetch orders via server API proxy to keep secret keys completely safe
 */
export async function fetchOrders(): Promise<{ orders: Order[]; source: 'supabase' | 'local'; error?: string }> {
  try {
    const res = await fetch('/api/orders', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('[Supabase Proxy] Server API error:', errData.error || res.statusText);
      serverStatusCache.isLive = false;
      return { orders: getLocalOrders(), source: 'local', error: errData.error || res.statusText };
    }

    const data = await res.json();
    serverStatusCache.isLive = true;

    if (Array.isArray(data.orders)) {
      const normalizedOrders: Order[] = data.orders.map((row: any) => {
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
          id: String(row.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `order-${Date.now()}`)),
          created_at: row.created_at || new Date().toISOString(),
          customer_name: String(row.customer_name || 'Pelanggan'),
          customer_phone: String(row.customer_phone || ''),
          selected_items: safeSelected,
          total_price: Number(row.total_price) || 0,
          status: (row.status === 'processed' ? 'processed' : 'pending') as OrderStatus,
        };
      });

      saveLocalOrders(normalizedOrders);
      return { orders: normalizedOrders, source: 'supabase' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Supabase Proxy] Network fetch error, using local orders:', msg);
    return { orders: getLocalOrders(), source: 'local', error: msg };
  }

  return { orders: getLocalOrders(), source: 'local' };
}

/**
 * Subscribe to order updates via polling and focus events
 */
export function subscribeToOrders(onUpdate: () => void): (() => void) | null {
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
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

/**
 * Insert a new order to Supabase database via backend proxy
 */
export async function insertOrder(orderPayload: {
  customer_name: string;
  customer_phone: string;
  selected_items: SelectedItemsPayload;
  total_price: number;
}): Promise<{ order: Order; source: 'supabase' | 'local' }> {
  const nowIso = new Date().toISOString();

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: orderPayload.customer_name,
        customer_phone: orderPayload.customer_phone,
        selected_items: orderPayload.selected_items,
        total_price: orderPayload.total_price,
        status: 'pending',
      }),
    });

    if (res.ok) {
      const resJson = await res.json();
      const data = resJson.order;

      let selected = data.selected_items;
      if (typeof selected === 'string') {
        try {
          selected = JSON.parse(selected);
        } catch {
          selected = orderPayload.selected_items;
        }
      }

      const insertedOrder: Order = {
        id: String(data.id),
        created_at: data.created_at || nowIso,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        selected_items: selected,
        total_price: Number(data.total_price),
        status: (data.status === 'processed' ? 'processed' : 'pending') as OrderStatus,
      };

      const current = getLocalOrders();
      saveLocalOrders([insertedOrder, ...current.filter(o => o.id !== insertedOrder.id)]);
      return { order: insertedOrder, source: 'supabase' };
    }
  } catch (err) {
    console.warn('[Supabase Proxy] Failed to post order to server, using local fallback:', err);
  }

  // Fallback local store insert
  const generatedId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
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
 * Update order status ('pending' <-> 'processed') in Supabase database
 */
export async function updateOrderStatusInDb(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      const current = getLocalOrders();
      const index = current.findIndex(o => o.id === orderId);
      if (index !== -1) {
        current[index].status = newStatus;
        saveLocalOrders([...current]);
      }
      return true;
    }
  } catch (err) {
    console.warn('[Supabase Proxy] Status update network error:', err);
  }

  // Fallback local store update
  const current = getLocalOrders();
  const index = current.findIndex(o => o.id === orderId);
  if (index !== -1) {
    current[index].status = newStatus;
    saveLocalOrders([...current]);
  }
  return true;
}

/**
 * Seed initial sample orders directly into Supabase database via backend
 */
export async function seedDemoOrdersToSupabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/orders/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: INITIAL_DEMO_ORDERS }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to seed demo orders via server API:', err);
    return false;
  }
}
