import React from 'react';
import { Check, Zap, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BASE_PACKAGES, EXPRESS_ADDON } from '../lib/constants';
import { BasePackage, PackageId } from '../types';
import { formatIDR } from '../lib/formatters';

interface ServiceSelectorProps {
  selectedPackageId: PackageId;
  onSelectPackage: (pkg: BasePackage) => void;
  expressDelivery: boolean;
  onToggleExpress: (val: boolean) => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedPackageId,
  onSelectPackage,
  expressDelivery,
  onToggleExpress,
}) => {
  return (
    <div id="service-selection-section" className="space-y-6">
      {/* 2.1 Base Packages */}
      <div id="base-packages-group" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="base-packages-heading" className="text-base font-semibold text-white tracking-tight">
              1. Pilih Paket Layanan Cuci Sepatu
            </h2>
            <p className="text-xs text-slate-400">
              Pilih satu paket utama (pilihan tunggal / mutually exclusive)
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            Wajib dipilih
          </span>
        </div>

        <div id="base-packages-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BASE_PACKAGES.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            return (
              <div
                key={pkg.id}
                id={`card-${pkg.id}`}
                onClick={() => onSelectPackage(pkg)}
                className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-200 backdrop-blur-md select-none flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900/95 border-2 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                {/* Popular badge if applicable */}
                {pkg.badge && (
                  <div 
                    id={`badge-${pkg.id}`}
                    className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[11px] tracking-wide shadow-sm"
                  >
                    {pkg.badge}
                  </div>
                )}

                <div>
                  {/* Card Header: Radio indicator & title & price */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        id={`radio-indicator-${pkg.id}`}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 block">
                          {pkg.code}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {pkg.name.replace(/Package [AB] \((.*?)\)/, '$1')}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-extrabold text-white block">
                        {formatIDR(pkg.price)}
                      </span>
                    </div>
                  </div>

                  {/* Turnaround Time */}
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-3.5 bg-slate-950/40 px-2.5 py-1 rounded-lg w-fit border border-slate-800/60">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Estimasi Pengerjaan: <strong className="text-slate-200">{pkg.turnaround}</strong></span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    {pkg.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                    {pkg.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-slate-400">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Selection Prompt */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className={isSelected ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                    {isSelected ? '✓ Paket Aktif Terpilih' : 'Klik untuk memilih paket ini'}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">Pbase: {formatIDR(pkg.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2.2 Optional Add-ons: Express Delivery */}
      <div id="addons-group" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="addons-heading" className="text-base font-semibold text-white tracking-tight">
              2. Tambahan Layanan Opsional (Add-on)
            </h2>
            <p className="text-xs text-slate-400">
              Centang jika membutuhkan pengerjaan ekspres kilat
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            Opsional
          </span>
        </div>

        <div
          id="card-addon-express"
          onClick={() => onToggleExpress(!expressDelivery)}
          className={`rounded-2xl p-5 cursor-pointer transition-all duration-200 backdrop-blur-md select-none border ${
            expressDelivery
              ? 'bg-slate-900/95 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3.5">
              {/* Checkbox indicator */}
              <div
                id="checkbox-indicator-express"
                className={`w-5 h-5 mt-0.5 rounded-lg border flex items-center justify-center transition-colors ${
                  expressDelivery
                    ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                    : 'border-slate-600 bg-slate-800'
                }`}
              >
                {expressDelivery && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-1.5">
                    <span>{EXPRESS_ADDON.name}</span>
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {EXPRESS_ADDON.turnaround}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
                  {EXPRESS_ADDON.description}
                </p>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Garansi kepuasan & penanganan khusus oleh senior sneaker technician</span>
                </div>
              </div>
            </div>

            <div className="text-right pl-3 shrink-0">
              <span className="text-base sm:text-lg font-extrabold text-white block">
                +{formatIDR(EXPRESS_ADDON.price)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {expressDelivery ? 'Aktif (E=1)' : 'Nonaktif (E=0)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
