import React from 'react';
import { User, Phone, AlertCircle, Info } from 'lucide-react';

interface CustomerFormProps {
  fullName: string;
  setFullName: (val: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  errors: {
    fullName?: string;
    phoneNumber?: string;
  };
  setErrors: React.Dispatch<React.SetStateAction<{ fullName?: string; phoneNumber?: string }>>;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  fullName,
  setFullName,
  phoneNumber,
  setPhoneNumber,
  errors,
  setErrors,
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    if (errors.fullName) {
      setErrors((prev) => ({ ...prev, fullName: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    if (errors.phoneNumber) {
      setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
    }
  };

  return (
    <div id="customer-input-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="customer-info-heading" className="text-base font-semibold text-white tracking-tight">
            3. Data Pemesan & Nomor WhatsApp
          </h2>
          <p className="text-xs text-slate-400">
            Digunakan untuk konfirmasi pesanan dan update progres pengerjaan
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          Wajib diisi
        </span>
      </div>

      <div 
        id="customer-form-card" 
        className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name Input */}
          <div id="field-full-name-group" className="space-y-1.5">
            <label 
              htmlFor="input-customer-name" 
              className="text-xs font-medium text-slate-300 flex items-center justify-between"
            >
              <span className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Nama Lengkap <span className="text-rose-400">*</span></span>
              </span>
            </label>
            <div className="relative">
              <input
                id="input-customer-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={handleNameChange}
                placeholder="misal: Rizky Pratama"
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-950/80 text-white text-sm placeholder:text-slate-500 border transition-all outline-none ${
                  errors.fullName
                    ? 'border-rose-500/80 ring-1 ring-rose-500/30'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              />
            </div>
            {errors.fullName ? (
              <p id="error-customer-name" className="text-[11px] text-rose-400 flex items-center space-x-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.fullName}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">Nama pemilik atau penyerah sepatu</p>
            )}
          </div>

          {/* WhatsApp Phone Number Input */}
          <div id="field-phone-number-group" className="space-y-1.5">
            <label 
              htmlFor="input-customer-phone" 
              className="text-xs font-medium text-slate-300 flex items-center justify-between"
            >
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Nomor WhatsApp <span className="text-rose-400">*</span></span>
              </span>
            </label>
            <div className="relative">
              <input
                id="input-customer-phone"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="misal: 081234567890 atau 628..."
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-950/80 text-white text-sm placeholder:text-slate-500 border transition-all outline-none ${
                  errors.phoneNumber
                    ? 'border-rose-500/80 ring-1 ring-rose-500/30'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              />
            </div>
            {errors.phoneNumber ? (
              <p id="error-customer-phone" className="text-[11px] text-rose-400 flex items-center space-x-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.phoneNumber}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">Format lokal (08...) atau internasional (+62...)</p>
            )}
          </div>
        </div>

        {/* Small privacy & operational badge */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Nomor aktif WhatsApp diperlukan untuk menerima tanda terima digital dan estimasi waktu pick-up.</span>
        </div>
      </div>
    </div>
  );
};
