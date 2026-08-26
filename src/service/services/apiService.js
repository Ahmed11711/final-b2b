// src/services/apiService.js
import axios from "axios";

// const BASE_URL = "https://b2bpartnership.com/api/api/admin/v1/";
 const BASE_URL = "http://localhost:8000/api/admin/v1/"; // Use this for local development

const api = axios.create({
  baseURL: BASE_URL,
 });

 api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accesstoken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      showSessionExpiredModal();
    }
    return Promise.reject(error);
  }
);

function showSessionExpiredModal() {
  // لو في modal موجود قبل كده، متعملوش تاني
  if (document.getElementById('session-expired-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'session-expired-modal';
  modal.innerHTML = `
    <div style="
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease;
    ">
      <div style="
        background: #fff;
        border-radius: 24px;
        padding: 40px 36px;
        max-width: 420px; width: 90%;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.15);
        animation: slideUp 0.3s ease;
      ">
        <!-- Icon -->
        <div style="
          width: 72px; height: 72px;
          background: #fff4e5;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        ">
          <svg width="36" height="36" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>

        <h2 style="font-size:22px; font-weight:700; color:#1a1a2e; margin-bottom:10px;">
          انتهت الجلسة
        </h2>
        <p style="font-size:14px; color:#6b7280; margin-bottom:28px; line-height:1.6;">
          لقد انتهت صلاحية جلستك، يرجى تسجيل الدخول مرة أخرى للمتابعة.
        </p>

        <button id="session-login-btn" style="
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        ">
          تسجيل الدخول
        </button>
      </div>
    </div>

    <style>
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      #session-login-btn:hover { opacity: 0.9; }
    </style>
  `;

  document.body.appendChild(modal);

  document.getElementById('session-login-btn').addEventListener('click', () => {
    window.location.href = '/login';
  });
}
// 🟢 Get All
export const getAll = async (endpoint, params = {}) => {
  const response = await api.get(`${endpoint}`, { params });
  return response.data;
};

// 🟢 Get One
export const getOne = async (endpoint, id) => {
  const response = await api.get(`/${endpoint}/${id}`);
  return response.data.data;
};

// 🟡 Create
export const createItem = async (endpoint, data) => {
   const response = await api.post(`/${endpoint}`, data, {
    headers: {
       'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
    },
  });
  return response.data;
};

// 🔵 Update
export const updateItem = async (endpoint, id, data) => {
  const isFormData = data instanceof FormData;

  if (isFormData) {
    if (!data.has('_method')) {
      data.append('_method', 'PUT');
    }

    const response = await api.post(`/${endpoint}/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data || response.data;
  }

  const response = await api.put(`/${endpoint}/${id}`, data);
  return response.data.data || response.data;
};

// 🔴 Delete
export const deleteItem = async (endpoint, id) => {
  const response = await api.delete(`/${endpoint}/${id}`);
  return response.data.data;
};