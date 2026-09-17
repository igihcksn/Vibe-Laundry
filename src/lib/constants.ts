import { BasePackage, AddOn } from '../types';

export const BASE_PACKAGES: BasePackage[] = [
  {
    id: 'package_a',
    code: 'Package A',
    name: 'Package A (Basic Clean)',
    price: 50000,
    turnaround: '3-4 Hari Kerja',
    description: 'Pembersihan standar untuk perawatan rutin dan kotoran ringan harian.',
    features: [
      'Pembersihan upper material standar',
      'Pembersihan midsole & outsole ringan',
      'Refresher & pewangi anti-bakteri',
      'Free silica gel & ziplock protection'
    ]
  },
  {
    id: 'package_b',
    code: 'Package B',
    name: 'Package B (Deep Clean)',
    price: 90000,
    badge: 'Paling Populer',
    turnaround: '2-3 Hari Kerja',
    description: 'Pembersihan menyeluruh mendalam hingga ke serat kain, insole, dan tapak bawah.',
    features: [
      'Deep foam extraction material upper',
      'Detailing midsole, insole & tali sepatu',
      'Pembersihan tapak outsole menyeluruh',
      'Treatment anti-jamur & sterilisasi UV/Ozon',
      'Premium long-lasting sneaker perfume'
    ]
  }
];

export const EXPRESS_ADDON: AddOn = {
  id: 'express',
  name: 'Express Delivery',
  price: 25000,
  turnaround: 'Prioritas 24 Jam',
  description: 'Pengerjaan kilat dengan antrean prioritas selesai dan siap kirim dalam 24 jam.'
};

export const ADMIN_WHATSAPP_NUMBER = '6281112223445';

export const PRICE_BOUNDARIES = {
  min: 50000, // Package A, Express unchecked
  max: 115000 // Package B, Express checked
};
