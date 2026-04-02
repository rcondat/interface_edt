import { useDraggable } from "@dnd-kit/core";
import { durationLabel, groupPalette } from "../utils/schedule";

function PaletteTile({
  course,
  isSelected,
  onSelectCourseType,
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${course.id}`,
    data: {
      source: "palette",
      typeId: course.id,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={isSelected ? "tile tile-selected" : "tile"}
      onClick={() => onSelectCourseType(isSelected ? null : course.id)}
      {...listeners}
      {...attributes}
    >
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

      {isDragging && <span className="tile-drag-hint">Déplacement…</span>}
    </button>
  );
}

export default function Sidebar({
  semesterName,
  courseTypes,
  assignments,
  selectedCourseTypeId,
  onSelectCourseType,
}) {
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

              {items.map((course) => {
                const isSelected = selectedCourseTypeId === course.id;

                return (
                  <PaletteTile
                    key={course.id}
                    course={course}
                    isSelected={isSelected}
                    onSelectCourseType={onSelectCourseType}
                  />
                );
              })}
            </section>
          ))
        )}
      </div>
    </aside>
  );
}