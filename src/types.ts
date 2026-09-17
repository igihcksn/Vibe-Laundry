export type PackageId = 'package_a' | 'package_b';

export interface BasePackage {
  id: PackageId;
  code: 'Package A' | 'Package B';
  name: string;
  price: number;
  badge?: string;
  turnaround: string;
  description: string;
  features: string[];
}

export interface AddOn {
  id: 'express';
  name: string;
  price: number;
  turnaround: string;
  description: string;
}

export interface SelectedItemsPayload {
  package_id: PackageId;
  package_name: string;
  package_price: number;
  express_delivery: boolean;
  express_price: number;
}

export type OrderStatus = 'pending' | 'processed';

export interface Order {
  id: string; // UUID
  created_at: string; // ISO 8601 string
  customer_name: string;
  customer_phone: string;
  selected_items: SelectedItemsPayload;
  total_price: number;
  status: OrderStatus;
}
