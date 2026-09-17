import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, Terminal, Key, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { 
  getActiveSupabaseCredentials, 
  setCustomSupabaseCredentials, 
  resetCustomSupabaseCredentials 
} from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

const SQL_SCHEMA_SCRIPT = `-- 1. Create orders table according to specification
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  selected_items jsonb not null,
  total_price integer not null,
  status text not null default 'pending'
);

-- 2. Enable Row Level Security (RLS)
alter table public.orders enable row level security;

-- 3. Row Level Security Policies
-- Insert: Public anon role can submit quote orders
create policy "Public insert access" 
  on public.orders 
  for insert 
  with check (true);

-- Select: Retrieve historical records for order tracking
create policy "Public select access" 
  on public.orders 
  for select 
  using (true);

-- Update: Allow operator status toggle ('pending' / 'processed')
create policy "Public update status access" 
  on public.orders 
  for update 
  using (true);
`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [isSecretWarning, setIsSecretWarning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getActiveSupabaseCredentials();
      setUrlInput(creds.url);
      setKeyInput(creds.key);
      setIsSecretWarning(creds.isSecretKey);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) return;

    setCustomSupabaseCredentials(urlInput.trim(), keyInput.trim());
    setIsSecretWarning(keyInput.trim().startsWith('sb_secret_'));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (onConfigChanged) {
      onConfigChanged();
    }
  };

  const handleResetCredentials = () => {
    resetCustomSupabaseCredentials();
    const creds = getActiveSupabaseCredentials();
    setUrlInput(creds.url);
    setKeyInput(creds.key);
    setIsSecretWarning(creds.isSecretKey);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (onConfigChanged) {
      onConfigChanged();
    }
  };

  return (
    <div 
      id="supabase-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="supabase-modal-container"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Konfigurasi Database & SQL Schema</h3>
              <p className="text-xs text-slate-400">Pengaturan Supabase Client-Side & Tabel 'orders'</p>
            </div>
          </div>
          <button
            id="close-modal-button"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Key Explanation / Warning Note */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-white">Panduan Tipe Kunci API Supabase</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Supabase secara otomatis memblokir kunci bertipe <code className="text-amber-300">sb_secret_...</code> langsung di browser (<span className="italic text-slate-300">Forbidden use of secret API key in browser</span>). 
                  Untuk aplikasi sisi klien, gunakan <strong className="text-emerald-400">Publishable / Anon Key</strong> (<code className="text-emerald-300">sb_publishable_...</code> atau token JWT).
                </p>
                {isSecretWarning && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-2 text-[11px]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      Kunci saat ini berformat <code>sb_secret_</code>. Sistem otomatis merutekannya via proxy dev internal tanpa memerlukan server terpisah. Untuk produksi murni client-side, disarankan menggunakan <code>sb_publishable_</code>.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kredensial Supabase (Opsional Simpan di Browser)</span>
              </span>
              {saveSuccess && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Kredensial Diperbarui!</span>
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Supabase Project URL</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Supabase API Key (Publishable / Anon Key disukai)
                </label>
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sb_publishable_... atau eyJhbGciOiJIUzI1NiIsInR5..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={handleResetCredentials}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                title="Kembalikan ke environment default"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Default</span>
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
              >
                <Check className="w-3 h-3" />
                <span>Terapkan Kunci</span>
              </button>
            </div>
          </form>

          {/* SQL Table Schema */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase SQL Script (Spesifikasi Tabel & RLS)</span>
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center space-x-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin SQL Schema</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56 select-all">
              {SQL_SCHEMA_SCRIPT}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
