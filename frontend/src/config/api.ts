/**
 * Backend API base (includes /api prefix). For production, set REACT_APP_API_BASE_URL
 * in Vercel Project → Settings → Environment Variables (Production / Preview as needed).
 */
const raw = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
export const API_BASE_URL = raw.replace(/\/$/, '');
