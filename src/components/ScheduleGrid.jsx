export default function ScheduleGrid({ days, slots }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Grille</h2>
      </div>

      <div className="panel-body">
        <div className="grid-wrap">
          <div
            className="schedule-grid"
            style={{ gridTemplateColumns: `110px repeat(${days.length}, minmax(160px, 1fr))` }}
          >
            <div className="grid-corner" />
            {days.map((day) => (
              <div key={day} className="grid-header">
                {day}
              </div>
            ))}

            <div className="time-column">
              {slots.map((slot) => (
                <div key={slot.id} className="time-slot">
                  {slot.label}
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div key={day} className="day-column">
                {slots.map((slot) => (
                  <div key={slot.id} className="grid-cell" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}