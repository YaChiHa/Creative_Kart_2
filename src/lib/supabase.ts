import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = Boolean(url && anonKey);
export const supabase = cloudEnabled ? createClient(url!, anonKey!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export type CloudProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  description: string;
  image_url: string;
  stock: number;
  featured: boolean;
  active: boolean;
};

export type StoreSettings = {
  id: string;
  whatsapp_number: string;
  instagram_url: string;
  store_name: string;
};

export type CloudEnquiry = {
  id: string;
  reference: string;
  customer_name: string;
  phone: string;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  total: number;
  status: string;
  created_at: string;
};

export const fromCloudProduct = (p: CloudProduct) => ({
  id: p.id, name: p.name, cat: p.category, price: Number(p.price), sku: p.sku,
  desc: p.description, img: p.image_url, stock: p.stock, featured: p.featured,
});

export const toCloudProduct = (p: any): CloudProduct => ({
  id: p.id, name: p.name, category: p.cat, price: Number(p.price), sku: p.sku,
  description: p.desc, image_url: p.img, stock: Number(p.stock),
  featured: Boolean(p.featured), active: true,
});
