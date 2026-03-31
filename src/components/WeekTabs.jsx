export default function WeekTabs({ weeks, activeWeekId, onChange }) {
  return (
    <div className="week-tabs">
      {weeks.map((week) => (
        <button
          key={week.id}
          className={week.id === activeWeekId ? "week-tab active" : "week-tab"}
          onClick={() => onChange(week.id)}
        >
          {week.label}
        </button>
      ))}
    </div>
  );
}