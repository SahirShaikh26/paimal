import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Production API (Vercel functions, bom1). During dev on the same WiFi, point
// this at your laptop's local IP instead: http://192.168.x.x:4000/api
const BASE_URL = 'https://paimal-api.vercel.app/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (cfg) => {
  const token = await SecureStore.getItemAsync('fp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const setToken = (token) => SecureStore.setItemAsync('fp_token', token);
export const clearToken = () => SecureStore.deleteItemAsync('fp_token');

export default api;
