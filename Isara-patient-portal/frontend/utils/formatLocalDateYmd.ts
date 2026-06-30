/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function formatLocalDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalYmd(): string {
  return formatLocalDateYmd(new Date());
}
