import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BASE_PACKAGES, 
  EXPRESS_ADDON, 
  ADMIN_WHATSAPP_NUMBER 
} from './lib/constants';
import { BasePackage, PackageId, Order, OrderStatus } from './types';
import { 
  formatIDR, 
  cleanPhoneForWhatsApp, 
  generateWhatsAppMessage, 
  buildWhatsAppUrl 
} from './lib/formatters';
import { 
  fetchOrders, 
  insertOrder, 
  updateOrderStatusInDb, 
  getActiveSupabaseCredentials,
  subscribeToOrders,
  seedDemoOrdersToSupabase
} from './lib/supabase';
import { Header } from './components/Header';
import { ServiceSelector } from './components/ServiceSelector';
import { CustomerForm } from './components/CustomerForm';
import { PriceSummaryBox } from './components/PriceSummaryBox';
import { OrderHistoryTable } from './components/OrderHistoryTable';
import { CheckCircle2, MessageCircle, ArrowRight, ExternalLink, Loader2, AlertTriangle, Database } from 'lucide-react';

export default function App() {
  // Service configuration state
  const [selectedPackage, setSelectedPackage] = useState<BasePackage>(BASE_PACKAGES[0]);
  const [expressDelivery, setExpressDelivery] = useState<boolean>(false);

  // Customer details state
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ fullName?: string; phoneNumber?: string }>({});

  // Operational orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [storageSource, setStorageSource] = useState<'supabase' | 'local'>('local');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSecretKeyError, setIsSecretKeyError] = useState<boolean>(false);

  // Supabase connection state
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);

  // Success toast for dispatched order
  const [recentOrderSuccess, setRecentOrderSuccess] = useState<{
    id: string;
    waUrl: string;
    source?: 'supabase' | 'local';
    error?: string;
  } | null>(null);

  // Synchronous price calculation based on specification formula:
  // Total Price = Pbase + (Pexpress * E)
  const totalPrice = useMemo(() => {
    const pBase = selectedPackage.price;
    const pExpress = EXPRESS_ADDON.price;
    const e = expressDelivery ? 1 : 0;
    return pBase + (pExpress * e);
  }, [selectedPackage, expressDelivery]);

  // Check Supabase connection status
  const checkSupabaseStatus = useCallback(() => {
    const creds = getActiveSupabaseCredentials();
    setIsSupabaseLive(creds.isLive);
  }, []);

  // Load orders from database
  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const result = await fetchOrders();
      setOrders(result.orders);
      setStorageSource(result.source);
      if (result.source === 'supabase') {
        setIsSupabaseLive(true);
        setLoadError(null);
        setIsSecretKeyError(false);
      } else {
        if (result.error) {
          setLoadError(result.error);
          setIsSecretKeyError(Boolean(result.isSecretKeyError));
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    checkSupabaseStatus();
    loadOrders();

    // Listen to real-time changes in Supabase orders table
    const unsubscribe = subscribeToOrders(() => {
      loadOrders();
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [checkSupabaseStatus, loadOrders]);

  const handleSeedSampleOrders = async () => {
    setIsLoadingOrders(true);
    try {
      await seedDemoOrdersToSupabase();
      await loadOrders();
    } catch (err) {
      console.error('Failed to seed sample orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: { fullName?: string; phoneNumber?: string } = {};

    if (!fullName.trim()) {
      errors.fullName = 'Nama lengkap wajib diisi.';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Nama minimal 2 karakter.';
    }

    const cleanedPhone = cleanPhoneForWhatsApp(phoneNumber);
    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Nomor WhatsApp wajib diisi.';
    } else if (cleanedPhone.length < 8) {
      errors.phoneNumber = 'Format nomor WhatsApp tidak valid (terlalu pendek).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Order Submission Lifecycle Flow (Section 5)
  const handleSendOrder = async () => {
    if (!validateForm()) return;

    // Start loading state in the main web app while saving to server
    setIsSubmittingOrder(true);
    setRecentOrderSuccess(null);

    const cleanPhone = cleanPhoneForWhatsApp(phoneNumber);
    const selectedItemsPayload = {
      package_id: selectedPackage.id,
      package_name: selectedPackage.name,
      package_price: selectedPackage.price,
      express_delivery: expressDelivery,
      express_price: expressDelivery ? EXPRESS_ADDON.price : 0
    };

    // Pre-generate order identifier for WhatsApp message
    const orderRefId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `ord-${Date.now()}`;

    // Construct WhatsApp Deep Link immediately
    const messageText = generateWhatsAppMessage({
      id: orderRefId,
      customer_name: fullName.trim(),
      customer_phone: cleanPhone,
      package_name: selectedPackage.name,
      package_price: selectedPackage.price,
      express_delivery: expressDelivery,
      total_price: totalPrice
    });

    const waUrl = buildWhatsAppUrl(messageText, ADMIN_WHATSAPP_NUMBER);

    // Start database insertion immediately to ensure it reaches Supabase
    const insertPromise = insertOrder({
      customer_name: fullName.trim(),
      customer_phone: cleanPhone,
      selected_items: selectedItemsPayload,
      total_price: totalPrice
    });

    // Redirect user to WhatsApp page / new tab immediately to preserve user gesture
    try {
      const openedWindow = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        const link = document.createElement('a');
        link.href = waUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (navErr) {
      console.warn('Auto redirect blocked by environment:', navErr);
    }

    try {
      // Step: Await database persistence
      const result = await insertPromise;
      const newOrder = result.order;

      // Prepend new order directly to Order History table state
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      if (result.source === 'supabase') {
        setStorageSource('supabase');
        setIsSupabaseLive(true);
      }

      // Provide notification state with easy re-open WhatsApp button
      setRecentOrderSuccess({
        id: newOrder.id,
        waUrl,
        source: result.source,
        error: result.error
      });

      // Reset form inputs & restore CTA button state
      setFullName('');
      setPhoneNumber('');
      setFormErrors({});
      setExpressDelivery(false);

    } catch (err) {
      console.error('Failed to submit order:', err);
      alert('Terjadi kendala saat menyimpan order ke server. Silakan coba lagi.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Admin Operational Step: Process status toggle
  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const nextStatus: OrderStatus = currentStatus === 'pending' ? 'processed' : 'pending';
    const success = await updateOrderStatusInDb(orderId, nextStatus);
    if (success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 lg:pb-16 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Loading Overlay: Waiting for data to be saved to server */}
      {isSubmittingOrder && (
        <div 
          id="order-saving-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Menyimpan Pesanan ke Server...</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Mohon tunggu sebentar, data pesanan sedang dicatat ke database server sementara WhatsApp diarahkan ke tab baru.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sinkronisasi database server...</span>
            </div>
          </div>
        </div>
      )}

      {/* App Header */}
      <Header 
        isSupabaseLive={isSupabaseLive} 
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Success Banner if Order Just Created */}
        {recentOrderSuccess && (
          <div 
            id="order-success-banner"
            className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-950/50"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white">
                  Order <span className="font-mono text-emerald-300">#{recentOrderSuccess.id.slice(0, 8)}</span>{' '}
                  {recentOrderSuccess.source === 'supabase'
                    ? 'berhasil dicatat langsung ke Database Supabase!'
                    : 'tersimpan di penyimpanan lokal browser.'}
                </p>
                <p className="text-xs text-emerald-300/80">
                  {recentOrderSuccess.source === 'supabase'
                    ? 'Data order otomatis tersinkronisasi ke tabel operasional di bawah.'
                    : 'Data order tercatat secara lokal. Hubungkan Supabase untuk sinkronisasi live.'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <a
                id="btn-reopen-whatsapp"
                href={recentOrderSuccess.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Buka WhatsApp Lagi</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
              <button
                type="button"
                onClick={() => setRecentOrderSuccess(null)}
                className="text-xs text-emerald-400/80 hover:text-white px-2 py-1 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Database Connection Status Alert */}
        {isSupabaseLive ? (
          <div 
            id="supabase-status-alert"
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-emerald-300"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-semibold text-white">Status Database:</span>
                <span>Terhubung ke Database Supabase.</span>
                <span className="text-emerald-400/80">Data pesanan tersinkronisasi secara langsung ke cloud.</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
              Supabase Terhubung
            </span>
          </div>
        ) : (
          <div 
            id="supabase-status-alert"
            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-300"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-semibold text-white">Status Database:</span>
                <span>
                  {isSecretKeyError
                    ? 'Perhatian: Terdeteksi Secret Key. Supabase membutuhkan Anon Key di browser.'
                    : 'Menggunakan Penyimpanan Lokal. Riwayat pesanan tetap tercatat di browser saat pengiriman WhatsApp.'}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 shrink-0">
              Penyimpanan Lokal
            </span>
          </div>
        )}

        {/* Top Grid: Left Side = Service Selection & Customer Form, Right Side = Sticky Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Interactive Configurator */}
          <div className="lg:col-span-8 space-y-8">
            {/* Step 1 & 2: Service Packages & Express Addon */}
            <ServiceSelector
              selectedPackageId={selectedPackage.id}
              onSelectPackage={(pkg) => setSelectedPackage(pkg)}
              expressDelivery={expressDelivery}
              onToggleExpress={(val) => setExpressDelivery(val)}
            />

            {/* Step 3: Customer Input Section */}
            <CustomerForm
              fullName={fullName}
              setFullName={setFullName}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              errors={formErrors}
              setErrors={setFormErrors}
            />
          </div>

          {/* Right Column (4 cols): Sticky Total Summary Box (Desktop) */}
          <div className="lg:col-span-4">
            <PriceSummaryBox
              selectedPackage={selectedPackage}
              expressDelivery={expressDelivery}
              totalPrice={totalPrice}
              isLoading={isSubmittingOrder}
              onSendOrder={handleSendOrder}
            />
          </div>
        </div>

        {/* Bottom Section: Order History & Operational Tracking Table */}
        <div className="border-t border-slate-800/80 mt-12 pt-4">
          <OrderHistoryTable
            orders={orders}
            onUpdateStatus={handleUpdateStatus}
            isLoading={isLoadingOrders}
            onRefresh={loadOrders}
            storageSource={storageSource}
            onSeedSampleOrders={handleSeedSampleOrders}
          />
        </div>
      </main>
    </div>
  );
}
