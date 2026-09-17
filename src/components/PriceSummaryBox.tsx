import React from 'react';
import { Send, Loader2, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { BasePackage } from '../types';
import { EXPRESS_ADDON } from '../lib/constants';
import { formatIDR } from '../lib/formatters';

interface PriceSummaryBoxProps {
  selectedPackage: BasePackage;
  expressDelivery: boolean;
  totalPrice: number;
  isLoading: boolean;
  onSendOrder: () => void;
}

export const PriceSummaryBox: React.FC<PriceSummaryBoxProps> = ({
  selectedPackage,
  expressDelivery,
  totalPrice,
  isLoading,
  onSendOrder,
}) => {
  const expressPrice = expressDelivery ? EXPRESS_ADDON.price : 0;

  return (
    <>
      {/* ================= DESKTOP STICKY SIDE-RAIL CARD ================= */}
      <div 
        id="desktop-summary-container" 
        className="hidden lg:block sticky top-24 space-y-4"
      >
        <div 
          id="desktop-summary-card"
          className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl shadow-slate-950/60 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h3 id="desktop-summary-title" className="text-base font-bold text-white tracking-tight">
                Ringkasan Estimasi Biaya
              </h3>
              <p className="text-xs text-slate-400">
                Kalkulasi real-time sesuai spesifikasi
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
              Live Quote
            </span>
          </div>

          {/* Line-item breakdown */}
          <div id="desktop-line-items" className="space-y-3 text-xs">
            {/* Base Package Line */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-slate-300 font-medium block">
                  {selectedPackage.name}
                </span>
                <span className="text-slate-500 text-[11px] block">
                  Pbase: Estimasi {selectedPackage.turnaround}
                </span>
              </div>
              <span className="font-semibold text-white whitespace-nowrap">
                {formatIDR(selectedPackage.price)}
              </span>
            </div>

            {/* Express Delivery Line */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className={`font-medium block ${expressDelivery ? 'text-slate-300' : 'text-slate-500'}`}>
                  {EXPRESS_ADDON.name} (Pexpress × {expressDelivery ? '1' : '0'})
                </span>
                <span className="text-slate-500 text-[11px] block">
                  {expressDelivery ? 'Prioritas pengerjaan 24 jam' : 'Tidak dipilih'}
                </span>
              </div>
              <span className={`font-semibold whitespace-nowrap ${expressDelivery ? 'text-white' : 'text-slate-500'}`}>
                {expressDelivery ? formatIDR(expressPrice) : 'Rp0'}
              </span>
            </div>

            {/* Math Formula Hint */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-slate-500">
                <span>Formula: Pbase + (Pexpress × E)</span>
                <span>E = {expressDelivery ? 1 : 0}</span>
              </div>
              <div className="font-mono text-slate-300">
                {formatIDR(selectedPackage.price)} + ({formatIDR(EXPRESS_ADDON.price)} × {expressDelivery ? 1 : 0})
              </div>
            </div>
          </div>

          {/* Total Row */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold text-slate-300">Total Estimasi</span>
              <span id="desktop-total-price" className="text-2xl font-black text-white tracking-tight">
                {formatIDR(totalPrice)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 text-right">
              *Harga pasti tanpa biaya tersembunyi
            </p>
          </div>

          {/* Primary Conversion CTA */}
          <div className="space-y-2.5 pt-1">
            <button
              id="desktop-cta-button"
              type="button"
              disabled={isLoading}
              onClick={onSendOrder}
              className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  <span>Send Order via WhatsApp</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center space-x-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Otomatis tercatat di database sebelum ke WhatsApp</span>
            </p>
          </div>

          {/* Value props */}
          <div className="border-t border-slate-800/60 pt-4 space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Gratis konsultasi noda & rekomendasi treatment</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Pick-up & Delivery tersedia untuk area operasional</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MOBILE PERSISTENT BOTTOM BAR ================= */}
      <div 
        id="mobile-bottom-bar"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-4 py-3 shadow-2xl"
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 truncate">
              <span>{selectedPackage.name.split('(')[0]}</span>
              {expressDelivery && (
                <span className="text-amber-400 font-medium">+Express</span>
              )}
            </div>
            <div id="mobile-total-price" className="text-xl font-extrabold text-white tracking-tight">
              {formatIDR(totalPrice)}
            </div>
          </div>

          <button
            id="mobile-cta-button"
            type="button"
            disabled={isLoading}
            onClick={onSendOrder}
            className="shrink-0 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-md shadow-emerald-950/40 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
