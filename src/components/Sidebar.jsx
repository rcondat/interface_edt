import { useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { durationLabel, groupPalette } from "../planner/selectors";

function PaletteTile({ course, isSelected, onSelectCourseType, onPaletteDragStart }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `palette-${course.id}`,
    data: {
      source: "palette",
      typeId: course.id,
    },
  });

  const tileRef = useRef(null);

  return (
    <button
      ref={(node) => {
        setNodeRef(node);
        tileRef.current = node;
      }}
      type="button"
      className={isSelected ? "tile tile-selected" : "tile"}
      onClick={() => onSelectCourseType(isSelected ? null : course.id)}
      onPointerDown={() => {
        const rect = tileRef.current?.getBoundingClientRect();
        if (rect && onPaletteDragStart) {
          onPaletteDragStart(course.id, rect.width, rect.height);
        }
      }}
      {...listeners}
      {...attributes}
    >
      <div className="tile-head">
        <div>
          <div className="tile-title">{course.label}</div>
          <div className="tile-subtitle">{course.subject}</div>
        </div>
        <span className="color-dot" style={{ backgroundColor: course.color }} />
      </div>

      <div className="tile-meta">
        <span>{durationLabel(course.durationSlots)}</span>
        <span className="pill">x{course.remaining}</span>
      </div>
    </button>
  );
}

export default function Sidebar({
  semesterName,
  courseTypes,
  assignments,
  selectedCourseTypeId,
  onSelectCourseType,
  activeDragItem,
  onPaletteDragStart,
}) {
  const groups = groupPalette(courseTypes, assignments);
  const isPaletteDrag = activeDragItem?.source === "palette";
  const draggedTypeId = isPaletteDrag ? activeDragItem.typeId : null;

  const { setNodeRef, isOver } = useDroppable({
    id: "sidebar-dropzone",
    data: {
      dropzone: "sidebar",
    },
  });

  const adjustedGroups = Object.fromEntries(
    Object.entries(groups)
      .map(([groupName, items]) => {
        const nextItems = items
          .map((course) => {
            if (course.id !== draggedTypeId) return course;
            return {
              ...course,
              remaining: course.remaining - 1,
            };
          })
          .filter((course) => course.remaining > 0);

        return [groupName, nextItems];
      })
      .filter(([, items]) => items.length > 0)
  );

  const showSidebarOverlay = isOver && activeDragItem?.source === "grid";

  return (
    <aside
      ref={setNodeRef}
      className={showSidebarOverlay ? "panel sidebar sidebar-drop-active" : "panel sidebar"}
    >
      <div className="panel-header sidebar-header">
        <div>
          <h2>Créneaux à placer</h2>
          <span className="badge">{semesterName}</span>
        </div>
      </div>

      {showSidebarOverlay && <div className="sidebar-drop-overlay" />}

      <div className="panel-body">
        {Object.keys(adjustedGroups).length === 0 ? (
          <div className="empty-box">Tous les créneaux configurés ont été placés.</div>
        ) : (
          Object.entries(adjustedGroups).map(([groupName, items]) => (
            <section key={groupName} className="palette-group">
              <h3>{groupName}</h3>

              {items.map((course) => (
                <PaletteTile
                  key={course.id}
                  course={course}
                  isSelected={selectedCourseTypeId === course.id}
                  onSelectCourseType={onSelectCourseType}
                  onPaletteDragStart={onPaletteDragStart}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </aside>
  );
}