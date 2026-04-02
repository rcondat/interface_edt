import { useDroppable } from "@dnd-kit/core";
import { getMergedBlocksForDay, durationLabel } from "../utils/schedule";

const SLOT_HEIGHT = 72;

function DroppableCell({
  day,
  slot,
  dayIndex,
  slotIndex,
  selectedCourseTypeId,
  onCellClick,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${dayIndex}-${slotIndex}`,
    data: {
      dayIndex,
      slotIndex,
    },
  });

  const isSelectedMode = Boolean(selectedCourseTypeId);

  let className = isSelectedMode ? "grid-cell grid-cell-selectable" : "grid-cell";
  if (isOver) className += " grid-cell-over";

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={className}
      onClick={() => onCellClick(dayIndex, slotIndex)}
      title={
        isSelectedMode
          ? `Placer sur ${day} - ${slot.label}`
          : `${day} - ${slot.label}`
      }
    />
  );
}

export default function ScheduleGrid({
  days,
  slots,
  assignments,
  activeWeekId,
  courseTypes,
  selectedCourseTypeId,
  onCellClick,
  onBlockClick,
}) {
  const courseTypesById = Object.fromEntries(
    courseTypes.map((course) => [course.id, course])
  );

  const activeGrid = assignments[activeWeekId] ?? {};

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Grille</h2>
      </div>

      <div className="panel-body">
        <div className="grid-wrap">
          <div
            className="schedule-grid"
            style={{
              gridTemplateColumns: `110px repeat(${days.length}, minmax(160px, 1fr))`,
            }}
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

            {days.map((day, dayIndex) => {
              const daySlots = activeGrid[dayIndex] ?? Array(slots.length).fill(null);
              const blocks = getMergedBlocksForDay(daySlots, courseTypesById);

              return (
                <div
                  key={day}
                  className="day-column"
                  style={{ height: `${slots.length * SLOT_HEIGHT}px` }}
                >
                  {slots.map((slot, slotIndex) => (
                    <DroppableCell
                      key={slot.id}
                      day={day}
                      slot={slot}
                      dayIndex={dayIndex}
                      slotIndex={slotIndex}
                      selectedCourseTypeId={selectedCourseTypeId}
                      onCellClick={onCellClick}
                    />
                  ))}

                  {blocks.map((block) => {
                    const course = courseTypesById[block.typeId];
                    const top = block.startSlot * SLOT_HEIGHT + 6;
                    const height = block.durationSlots * SLOT_HEIGHT - 12;
                    const firstSlot = slots[block.startSlot];
                    const lastSlot = slots[block.startSlot + block.durationSlots - 1];

                    return (
                      <button
                        key={`${dayIndex}-${block.typeId}-${block.startSlot}`}
                        type="button"
                        className="course-block"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: course.color,
                        }}
                        onClick={() =>
                          onBlockClick({
                            dayIndex,
                            startSlot: block.startSlot,
                            typeId: block.typeId,
                          })
                        }
                        title={`Supprimer ${course.label}`}
                      >
                        <div className="course-block-title">{course.label}</div>
                        <div className="course-block-meta">
                          {firstSlot.start} → {lastSlot.end}
                        </div>
                        <div className="course-block-foot">
                          <span>{durationLabel(block.durationSlots)}</span>
                          <span className="course-block-remove">Supprimer</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}