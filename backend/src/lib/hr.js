// Shared date math for the HR modules (leave, timesheets, payroll).
// All functions take/return YYYY-MM-DD strings and compute in UTC to stay
// timezone-stable regardless of server locale.

function toDate(s) {
  return new Date(`${s}T00:00:00Z`);
}

function toStr(d) {
  return d.toISOString().split('T')[0];
}

// working_days_per_week: 5 = Mon–Fri, 6 = Mon–Sat, 7 = every day.
function isWorkingDay(dateStr, workingDaysPerWeek) {
  const day = toDate(dateStr).getUTCDay(); // 0=Sun … 6=Sat
  if (workingDaysPerWeek >= 7) return true;
  if (day === 0) return false;
  if (day === 6) return workingDaysPerWeek >= 6;
  return true;
}

function eachDay(startStr, endStr) {
  const out = [];
  for (let d = toDate(startStr); d <= toDate(endStr); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(toStr(d));
  }
  return out;
}

function workingDaysBetween(startStr, endStr, workingDaysPerWeek) {
  return eachDay(startStr, endStr).filter((d) => isWorkingDay(d, workingDaysPerWeek)).length;
}

// Pay-period bounds containing `dateStr`.
// weekly: Mon–Sun. biweekly: 14-day blocks anchored to the first Monday of the
// year. monthly: calendar month.
function periodBounds(payPeriod, dateStr) {
  const d = toDate(dateStr);
  if (payPeriod === 'monthly') {
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return { start: toStr(start), end: toStr(end) };
  }
  if (payPeriod === 'weekly') {
    const day = d.getUTCDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() + diffToMon);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start: toStr(start), end: toStr(end) };
  }
  // biweekly
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const jan1Day = jan1.getUTCDay();
  const anchor = new Date(jan1);
  anchor.setUTCDate(jan1.getUTCDate() + ((8 - jan1Day) % 7)); // first Monday
  if (d < anchor) {
    // days before the first Monday belong to the last period of the prior year
    return periodBounds('biweekly', `${d.getUTCFullYear() - 1}-12-31`);
  }
  const idx = Math.floor((d - anchor) / (14 * 86400000));
  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() + idx * 14);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 13);
  return { start: toStr(start), end: toStr(end) };
}

// Most recent `count` periods ending with the one containing `today`.
function recentPeriods(payPeriod, todayStr, count) {
  const out = [];
  let { start, end } = periodBounds(payPeriod, todayStr);
  for (let i = 0; i < count; i++) {
    out.push({ start, end });
    const prev = new Date(toDate(start));
    prev.setUTCDate(prev.getUTCDate() - 1);
    ({ start, end } = periodBounds(payPeriod, toStr(prev)));
  }
  return out;
}

module.exports = { isWorkingDay, eachDay, workingDaysBetween, periodBounds, recentPeriods, toStr };
