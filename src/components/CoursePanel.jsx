import { useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { durationLabel } from "../planner/gridSelectors";
import { getPaletteGroups } from "../planner/dbSelectors";

function PaletteTile({
  course,
  isSelected,
  onSelectCourseType,
  onPaletteDragStart,
  onSelectPaletteCourse,
}) {
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
      onClick={() => {
        onSelectCourseType(course.id);
        onSelectPaletteCourse?.(course.id);
      }}
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
        <div className="tile-head-main">
          <div className="tile-kicker">
            {course.promotionLabel ? (
              <span className="tile-kicker-text">{course.promotionLabel}</span>
            ) : null}
          </div>

          <div className="tile-title">{course.label}</div>
        </div>

        <span className="color-dot" style={{ backgroundColor: course.color }} />
      </div>

      <div className="tile-meta">
        <span className="tile-meta-item">{durationLabel(course.durationSlots)}</span>
        <span className="pill">{course.remaining} a placer</span>
      </div>
    </button>
  );
}

export default function CoursePanel({
  semesterName,
  db,
  selectedCourseTypeId,
  onSelectCourseType,
  activeDragItem,
  onPaletteDragStart,
  onSelectPaletteCourse,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const groups = getPaletteGroups(db);
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

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return adjustedGroups;

    return Object.fromEntries(
      Object.entries(adjustedGroups)
        .map(([groupName, items]) => {
          const groupMatches = groupName.toLowerCase().includes(normalizedQuery);

          const filteredItems = groupMatches
            ? items
            : items.filter((course) => {
                const haystack = [
                  course.label,
                  course.subject,
                  course.category,
                  course.promotionLabel,
                  ...(course.groupLabels ?? []),
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

                return haystack.includes(normalizedQuery);
              });

          return [groupName, filteredItems];
        })
        .filter(([, items]) => items.length > 0)
    );
  }, [adjustedGroups, normalizedQuery]);

  const showSidebarOverlay = isOver && activeDragItem?.source === "grid";

  return (
    <section ref={setNodeRef} className="panel sidebar-panel">
      <div className="panel-header">
        <h2>Creneaux a placer</h2>
        <div className="badge">{semesterName}</div>
      </div>

      <div className="panel-body sidebar-panel-body">
        {showSidebarOverlay && <div className="sidebar-drop-overlay" />}

        <div className="sidebar-search">
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Rechercher un EC ou un creneau..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="sidebar-ec-scroll-body scroll-area">
          {Object.keys(filteredGroups).length === 0 ? (
            <div className="empty-box">
              {normalizedQuery
                ? "Aucun creneau ne correspond a la recherche."
                : "Tous les creneaux configures ont ete places."}
            </div>
          ) : (
            Object.entries(filteredGroups).map(([groupName, items]) => (
              <section key={groupName} className="palette-group">
                <h3>{groupName}</h3>

                {items.map((course) => (
                  <PaletteTile
                    key={course.id}
                    course={course}
                    isSelected={selectedCourseTypeId === course.id}
                    onSelectCourseType={onSelectCourseType}
                    onPaletteDragStart={onPaletteDragStart}
                    onSelectPaletteCourse={onSelectPaletteCourse}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
