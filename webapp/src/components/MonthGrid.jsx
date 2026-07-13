import colors from '../theme';

// Reusable month calendar grid (Leave calendar, Tasks calendar).
// props: month 'YYYY-MM', onMonthChange(nextMonth), renderDay(dateStr) -> chips/nodes.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const s = {
  head: { display:'flex', alignItems:'center', gap:12, marginBottom:12 },
  navBtn: { padding:'4px 12px', background:colors.white, border:`1px solid ${colors.border}`, borderRadius:7, fontSize:14, cursor:'pointer', color:colors.text },
  title: { fontSize:15, fontWeight:700, color:colors.navy, minWidth:130, textAlign:'center' },
  grid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4 },
  wk: { fontSize:11, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.05em', padding:'4px 6px' },
  cell: { minHeight:74, background:colors.white, border:`1px solid ${colors.border}`, borderRadius:8, padding:'4px 6px', overflow:'hidden' },
  cellOut: { minHeight:74, background:colors.bgAlt, border:`1px solid ${colors.border}`, borderRadius:8, padding:'4px 6px', opacity:.45 },
  dayNum: { fontSize:11, fontWeight:600, color:colors.textMuted, marginBottom:2 },
  today: { color:colors.accent, fontWeight:800 },
};

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default function MonthGrid({ month, onMonthChange, renderDay }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first offset
  const today = new Date().toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7) cells.push(null);

  const label = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div>
      <div style={s.head}>
        <button style={s.navBtn} onClick={() => onMonthChange(shiftMonth(month, -1))}>‹</button>
        <div style={s.title}>{label}</div>
        <button style={s.navBtn} onClick={() => onMonthChange(shiftMonth(month, 1))}>›</button>
      </div>
      <div style={s.grid}>
        {WEEKDAYS.map((w) => <div key={w} style={s.wk}>{w}</div>)}
        {cells.map((date, i) => (
          <div key={i} style={date ? s.cell : s.cellOut}>
            {date && (
              <>
                <div style={{ ...s.dayNum, ...(date === today ? s.today : {}) }}>{Number(date.slice(8))}</div>
                {renderDay?.(date)}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
