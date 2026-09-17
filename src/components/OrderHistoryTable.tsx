import React, { useState } from 'react';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Phone, 
  Search, 
  ExternalLink, 
  Zap, 
  Loader2,
  RefreshCw,
  Sparkles,
  Database,
  Plus
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatIDR, formatDateTime, formatDisplayPhone, cleanPhoneForWhatsApp } from '../lib/formatters';

interface OrderHistoryTableProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, currentStatus: OrderStatus) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
  storageSource: 'supabase' | 'local';
  onSeedSampleOrders?: () => Promise<void>;
}

export const OrderHistoryTable: React.FC<OrderHistoryTableProps> = ({
  orders,
  onUpdateStatus,
  isLoading,
  onRefresh,
  storageSource,
  onSeedSampleOrders,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filterStatus === 'all' ? true : order.status === filterStatus;
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleToggleStatus = async (orderId: string, currentStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, currentStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSeed = async () => {
    if (!onSeedSampleOrders || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedSampleOrders();
    } finally {
      setIsSeeding(false);
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const processedCount = orders.filter((o) => o.status === 'processed').length;

  return (
    <div id="order-history-section" className="space-y-4 pt-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h2 id="order-history-heading" className="text-lg font-bold text-white tracking-tight">
              Operational Order Tracking
            </h2>
            <span 
              id="storage-badge-indicator"
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 ${
                storageSource === 'supabase'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${storageSource === 'supabase' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{storageSource === 'supabase' ? 'Database Supabase (Live)' : 'Penyimpanan Lokal (Offline)'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Riwayat pemesanan yang otomatis tercatat sebelum dialihkan ke WhatsApp
          </p>
        </div>

        {/* Refresh & Counts */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-amber-400 font-semibold">{pendingCount}</span> Pending
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">{processedCount}</span> Processed
          </div>

          <button
            id="button-refresh-orders"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Muat ulang data order"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        id="orders-filter-container" 
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md"
      >
        {/* Status Filter Tabs */}
        <div id="filter-tabs-group" className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <button
            id="filter-tab-all"
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            id="filter-tab-pending"
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterStatus === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <span>Pending</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20">{pendingCount}</span>
          </button>
          <button
            id="filter-tab-processed"
            type="button"
            onClick={() => setFilterStatus('processed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterStatus === 'processed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span>Processed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20">{processedCount}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div id="table-search-box" className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            id="input-search-orders"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau telepon..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/80 text-white text-xs border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Responsive Horizontally Scrollable Table Container */}
      <div 
        id="order-table-wrapper"
        className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-xl"
      >
        <div className="overflow-x-auto">
          <table id="orders-table" className="w-full text-left text-xs text-slate-300 border-collapse min-w-[760px]">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="py-3.5 px-4">Waktu Order</th>
                <th scope="col" className="py-3.5 px-4">Customer</th>
                <th scope="col" className="py-3.5 px-4">No. WhatsApp</th>
                <th scope="col" className="py-3.5 px-4">Paket & Add-on</th>
                <th scope="col" className="py-3.5 px-4 text-right">Total Biaya</th>
                <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                <th scope="col" className="py-3.5 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
                        <Database className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {orders.length === 0 
                          ? 'Belum ada data order di database Supabase' 
                          : 'Tidak ada order yang sesuai filter atau pencarian'}
                      </p>
                      <p className="text-xs text-slate-500 text-center leading-relaxed">
                        {orders.length === 0 
                          ? 'Setiap estimasi yang dikirim melalui formulir di atas akan langsung tersimpan ke database Supabase secara real-time.' 
                          : 'Coba ubah kata kunci pencarian atau ganti filter status di bagian atas.'}
                      </p>
                      {orders.length === 0 && onSeedSampleOrders && (
                        <button
                          id="button-seed-sample-orders"
                          type="button"
                          onClick={handleSeed}
                          disabled={isSeeding}
                          className="mt-2 inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isSeeding ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan ke Supabase...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Muat Data Contoh ke Supabase</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isUpdating = updatingId === order.id;
                  const isPending = order.status === 'pending';
                  const waCustomerUrl = `https://wa.me/${cleanPhoneForWhatsApp(order.customer_phone)}`;

                  return (
                    <tr 
                      key={order.id} 
                      id={`order-row-${order.id}`}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Timestamp & Truncated UUID */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-medium text-white flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{formatDateTime(order.created_at)}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5" title={order.id}>
                          ID: {order.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-4 px-4 font-semibold text-white whitespace-nowrap">
                        {order.customer_name}
                      </td>

                      {/* Contact Number with WhatsApp link */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <a
                          id={`customer-wa-link-${order.id}`}
                          href={waCustomerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 font-mono text-xs hover:underline"
                          title="Chat langsung ke nomor customer ini di WhatsApp"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{formatDisplayPhone(order.customer_phone)}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>

                      {/* Chosen Service & Add-ons */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-medium whitespace-nowrap">
                            {(order.selected_items?.package_name || 'Basic Clean').replace(/Package [AB] \((.*?)\)/, '$1')}
                          </span>
                          {Boolean(order.selected_items?.express_delivery) && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold flex items-center space-x-1 whitespace-nowrap">
                              <Zap className="w-3 h-3" />
                              <span>Express (24h)</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Cost in IDR */}
                      <td className="py-4 px-4 text-right font-bold text-white whitespace-nowrap">
                        {formatIDR(order.total_price)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isPending ? (
                          <span 
                            id={`status-badge-${order.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span 
                            id={`status-badge-${order.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Processed</span>
                          </span>
                        )}
                      </td>

                      {/* Admin Action Button */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          id={`action-toggle-status-${order.id}`}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleStatus(order.id, order.status)}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                            isPending
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : isPending ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Process</span>
                            </>
                          ) : (
                            <span>Set Pending</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
