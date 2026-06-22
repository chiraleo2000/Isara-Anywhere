/**
 * Canonical Living Will route — re-exports the PDPA implementation (P11–P12, G2).
 * App.tsx routes /living-will here; tests must target this path, not a duplicate copy.
 */
export { default } from './pdpa/LivingWillPage';
