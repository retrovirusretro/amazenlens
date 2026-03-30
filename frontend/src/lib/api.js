import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app';

// Supabase client — auth için direkt
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://mnpwuaupqkkgdoryfqlr.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucHd1YXVwcWtrZ2RvcnlmcWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTQxOTgsImV4cCI6MjA4OTA3MDE5OH0.RI6I66aXoDmpXvR9A4133OPSbJL8Y4blfX67Us40Ufw'
);

// Auth fonksiyonları — backend'e gitmiyor, direkt Supabase
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const registerUser = async (email, password, fullName = '') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
};

// Axios — Amazon/diğer API'lar için backend'e gider
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const searchProducts = (keyword, page = 1, market = 'US') =>
  api.get(`/api/amazon/search?keyword=${encodeURIComponent(keyword)}&page=${page}&market=${market}`);

export const getProduct = (asin) =>
  api.get(`/api/amazon/product/${asin}`);

export const getNicheScore = (asin) =>
  api.get(`/api/amazon/niche-score/${asin}`);

export const scanUnavailable = (asins) =>
  api.post('/api/amazon/unavailable-scanner', asins);

export default api;
