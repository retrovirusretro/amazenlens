import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Amazon API
export const searchProducts = (keyword, page = 1) =>
  api.get(`/api/amazon/search?keyword=${keyword}&page=${page}`);

export const getProduct = (asin) =>
  api.get(`/api/amazon/product/${asin}`);

export const getNicheScore = (asin) =>
  api.get(`/api/amazon/niche-score/${asin}`);

export const scanUnavailable = (asins) =>
  api.post('/api/amazon/unavailable-scanner', asins);

export default api;