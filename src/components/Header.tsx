import React from 'react';
import { Sparkles, Database, ShieldCheck } from 'lucide-react';
import { PRICE_BOUNDARIES } from '../lib/constants';
import { formatIDR } from '../lib/formatters';

interface HeaderProps {
  isSupabaseLive: boolean;
  onOpenSupabaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSupabaseLive, onOpenSupabaseModal }) => {
  return (
    <header id="app-header" className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Logo */}
        <div id="brand-container" className="flex items-center space-x-3.5">
          <div 
            id="brand-logo-icon" 
            className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40"
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 id="brand-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
                SneakerCare Studio
              </h1>
              <span 
                id="brand-version-badge" 
                className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                Intake & Estimator
              </span>
            </div>
            <p id="brand-subtitle" className="text-xs text-slate-400 hidden sm:block">
              Kalkulator estimasi harga transparan & pemesanan instan via WhatsApp
            </p>
          </div>
        </div>

        {/* Right Controls: Boundary Range & Supabase Status Button */}
        <div id="header-actions" className="flex items-center space-x-3">
          {/* Price Range Reference */}
          <div 
            id="price-boundary-badge"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400"
          >
            <span>Rentang Harga:</span>
            <span className="font-semibold text-white">
              {formatIDR(PRICE_BOUNDARIES.min)} - {formatIDR(PRICE_BOUNDARIES.max)}
            </span>
          </div>

          {/* Database Connection Button */}
          <button
            id="supabase-status-button"
            type="button"
            onClick={onOpenSupabaseModal}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all text-xs font-medium cursor-pointer"
            title="Lihat Supabase SQL Schema"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 hidden sm:inline">Penyimpanan:</span>
            <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Client-Side (Lokal)</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
