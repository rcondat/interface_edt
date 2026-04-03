import { SLOT_HEIGHT } from "../planner/constants";
import { getIgnoreBlock } from "../planner/preview";
import {
  getActiveGrid,
  getCourseTypesById,
  getMergedBlocksForDay,
} from "../planner/selectors";
import DraggableBlock from "./grid/DraggableBlock";
import DroppableCell from "./grid/DroppableCell";

export default function ScheduleGrid({
  days,
  slots,
  assignments,
  activeWeekId,
  activeWeek,
  courseTypes,
  teachers,
  selectedCourseTypeId,
  activeDragItem,
  activeDropTarget,
  onCellClick,
  onRemoveBlock,
  onSelectBlock,
  teacherMap,
  recentPlacement,
  pendingTeacherAssignments,
  selectedTeacherId,
}) {
  const courseTypesById = getCourseTypesById(courseTypes);
  const activeGrid = getActiveGrid(assignments, activeWeekId);

  const draggedCourse =
    activeDragItem?.typeId ? courseTypesById[activeDragItem.typeId] : null;

  const draggedBlock =
    activeDragItem?.source === "grid" &&
    typeof activeDragItem.fromDayIndex === "number" &&
    typeof activeDragItem.fromStartSlot === "number"
      ? activeGrid?.[activeDragItem.fromDayIndex]?.[activeDragItem.fromStartSlot] ?? null
      : null;

  const previewDuration = draggedCourse?.durationSlots ?? 0;
  const ignoreBlock = getIgnoreBlock(activeDragItem, draggedCourse);
  const previewAnchor =
    activeDropTarget?.dropzone === "sidebar" ? null : activeDropTarget;

  const isDragging = Boolean(activeDragItem);
  const preselectedTeacherId =
    activeDragItem?.source === "palette" && draggedCourse
      ? pendingTeacherAssignments?.[draggedCourse.id] ?? null
      : null;

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
                      activeGrid={activeGrid}
                      previewAnchor={previewAnchor}
                      previewDuration={previewDuration}
                      ignoreBlock={ignoreBlock}
                      slotCount={slots.length}
                      teachers={teachers}
                      courseType={draggedCourse}
                      draggedBlock={draggedBlock}
                      activeWeek={activeWeek}
                      isDragging={isDragging}
                      preselectedTeacherId={preselectedTeacherId}
                    />
                  ))}

                  {blocks.map((block) => {
                    const course = courseTypesById[block.typeId];

                    return (
                      <DraggableBlock
                        key={`${dayIndex}-${block.typeId}-${block.startSlot}`}
                        block={block}
                        dayIndex={dayIndex}
                        course={course}
                        teacherMap={teacherMap}
                        onRemoveBlock={onRemoveBlock}
                        onSelectBlock={onSelectBlock}
                        isRecentlyPlaced={
                          recentPlacement &&
                          recentPlacement.weekId === activeWeekId &&
                          recentPlacement.dayIndex === dayIndex &&
                          recentPlacement.startSlot === block.startSlot &&
                          recentPlacement.typeId === block.typeId
                        }
                        selectedTeacherId={selectedTeacherId}
                      />
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