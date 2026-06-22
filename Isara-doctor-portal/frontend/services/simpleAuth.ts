/**
 * @deprecated Import from authServices.ts instead. Thin re-export for legacy paths.
 */

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
  checkInactivityTimeout,
} from './authServices';

// Re-export default for compatibility
export { authService as default } from './authServices';
