/**
 * @deprecated This file is deprecated. Use authServices.ts instead.
 * All authentication now goes through GCS cloud storage.
 *
 * This file re-exports from authServices for backwards compatibility.
 */

console.warn('⚠️ simpleAuth.ts is deprecated. Please use authServices.ts instead.');

export {
  authService,
  register,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getToken,
  getAuthHeaders,
  refreshSession,
} from './authServices';

// Re-export default for compatibility
export { authService as default } from './authServices';
