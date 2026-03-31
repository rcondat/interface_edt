import { durationLabel, groupPalette } from "../utils/schedule";

export default function Sidebar({ semesterName, courseTypes, assignments }) {
  const groups = groupPalette(courseTypes, assignments);

  return (
    <aside className="panel sidebar">
      <div className="panel-header">
        <h2>Créneaux à placer</h2>
        <span className="badge">{semesterName}</span>
      </div>

      <div className="panel-body">
        {Object.keys(groups).length === 0 ? (
          <div className="empty-box">Tous les créneaux configurés ont été placés.</div>
        ) : (
          Object.entries(groups).map(([groupName, items]) => (
            <section key={groupName} className="palette-group">
              <h3>{groupName}</h3>
              {items.map((course) => (
                <div key={course.id} className="tile">
                  <div className="tile-head">
                    <div>
                      <div className="tile-title">{course.label}</div>
                      <div className="tile-subtitle">{course.subject}</div>
                    </div>
                    <span
                      className="color-dot"
                      style={{ backgroundColor: course.color }}
                    />
                  </div>

                  <div className="tile-meta">
                    <span>{durationLabel(course.durationSlots)}</span>
                    <span className="pill">x{course.remaining}</span>
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </aside>
  );
}