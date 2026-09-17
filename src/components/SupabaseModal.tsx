import React, { useState } from 'react';
import { X, Database, Check, Copy, Terminal } from 'lucide-react';

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
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      id="supabase-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="supabase-modal-container"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Supabase SQL Schema</h3>
              <p className="text-xs text-slate-400">Spesifikasi Tabel 'orders' & Row Level Security (RLS)</p>
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
        <div className="px-6 py-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* SQL Table Schema */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase SQL Script (Section 4 Spec)</span>
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
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-80 select-all">
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
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
