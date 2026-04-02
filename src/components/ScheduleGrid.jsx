import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  durationLabel,
  getActiveGrid,
  getCourseTypesById,
  getMergedBlocksForDay,
} from "../planner/selectors";

const SLOT_HEIGHT = 72;

function getPreviewState({
  activeGrid,
  previewAnchor,
  currentDayIndex,
  currentSlotIndex,
  previewDuration,
  ignoreBlock,
  slotCount,
}) {
  if (!previewAnchor || previewDuration <= 0) {
    return { isPreview: false, isValid: false };
  }

  const { dayIndex: anchorDayIndex, slotIndex: anchorSlotIndex } = previewAnchor;

  if (
    currentDayIndex !== anchorDayIndex ||
    currentSlotIndex < anchorSlotIndex ||
    currentSlotIndex >= anchorSlotIndex + previewDuration
  ) {
    return { isPreview: false, isValid: false };
  }

  if (anchorSlotIndex + previewDuration > slotCount) {
    return { isPreview: true, isValid: false };
  }

  for (let i = 0; i < previewDuration; i += 1) {
    const inspectedSlot = anchorSlotIndex + i;
    const cell = activeGrid[anchorDayIndex]?.[inspectedSlot];

    if (!cell) continue;

    if (
      ignoreBlock &&
      anchorDayIndex === ignoreBlock.dayIndex &&
      inspectedSlot >= ignoreBlock.startSlot &&
      inspectedSlot < ignoreBlock.startSlot + ignoreBlock.durationSlots
    ) {
      continue;
    }

    return { isPreview: true, isValid: false };
  }

  return { isPreview: true, isValid: true };
}

function DroppableCell({
  day,
  slot,
  dayIndex,
  slotIndex,
  selectedCourseTypeId,
  onCellClick,
  activeGrid,
  previewAnchor,
  previewDuration,
  ignoreBlock,
  slotCount,
}) {
  const { setNodeRef } = useDroppable({
    id: `cell-${dayIndex}-${slotIndex}`,
    data: {
      dayIndex,
      slotIndex,
    },
  });

  let className =
    selectedCourseTypeId ? "grid-cell grid-cell-selectable" : "grid-cell";

    const gridPreviewAnchor =
    previewAnchor?.dropzone === "sidebar" ? null : previewAnchor;

    const previewState = getPreviewState({
    activeGrid,
    previewAnchor: gridPreviewAnchor,
    currentDayIndex: dayIndex,
    currentSlotIndex: slotIndex,
    previewDuration,
    ignoreBlock,
    slotCount,
    });

  if (previewState.isPreview) {
    className += previewState.isValid
      ? " grid-cell-preview-valid"
      : " grid-cell-preview-invalid";
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={className}
      onClick={() => onCellClick(dayIndex, slotIndex)}
      title={
        selectedCourseTypeId ? `Placer sur ${day} - ${slot.label}` : `${day} - ${slot.label}`
      }
    />
  );
}

function DraggableBlock({
  block,
  dayIndex,
  slots,
  course,
  onRemoveBlock,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${dayIndex}-${block.startSlot}-${block.typeId}`,
    data: {
      source: "grid",
      typeId: block.typeId,
      fromDayIndex: dayIndex,
      fromStartSlot: block.startSlot,
    },
  });

  const top = block.startSlot * SLOT_HEIGHT + 6;
  const height = block.durationSlots * SLOT_HEIGHT - 12;
  const firstSlot = slots[block.startSlot];
  const lastSlot = slots[block.startSlot + block.durationSlots - 1];

  const style = {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: course.color,
    opacity: isDragging ? 0.35 : 1,
  };

  if (transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  return (
    <div
      ref={setNodeRef}
      className="course-block"
      style={style}
      title={course.label}
      {...listeners}
      {...attributes}
    >
      <button
        type="button"
        className="course-block-delete"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemoveBlock({
            dayIndex,
            startSlot: block.startSlot,
            typeId: block.typeId,
          });
        }}
        aria-label={`Supprimer ${course.label}`}
        title={`Supprimer ${course.label}`}
      >
        ×
      </button>

      <div className="course-block-title">{course.label}</div>
      <div className="course-block-meta">
        {firstSlot.start} → {lastSlot.end}
      </div>
      <div className="course-block-foot">
        <span>{durationLabel(block.durationSlots)}</span>
      </div>
    </div>
  );
}

export default function ScheduleGrid({
  days,
  slots,
  assignments,
  activeWeekId,
  courseTypes,
  selectedCourseTypeId,
  activeDragItem,
  activeDropTarget,
  onCellClick,
  onRemoveBlock,
}) {
  const courseTypesById = getCourseTypesById(courseTypes);
  const activeGrid = getActiveGrid(assignments, activeWeekId);

  const draggedCourse =
    activeDragItem?.typeId ? courseTypesById[activeDragItem.typeId] : null;

  const previewDuration = draggedCourse?.durationSlots ?? 0;

  const ignoreBlock =
    activeDragItem?.source === "grid" && draggedCourse
      ? {
          dayIndex: activeDragItem.fromDayIndex,
          startSlot: activeDragItem.fromStartSlot,
          durationSlots: draggedCourse.durationSlots,
        }
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
                      previewAnchor={activeDropTarget}
                      previewDuration={previewDuration}
                      ignoreBlock={ignoreBlock}
                      slotCount={slots.length}
                    />
                  ))}

                  {blocks.map((block) => {
                    const course = courseTypesById[block.typeId];

                    return (
                      <DraggableBlock
                        key={`${dayIndex}-${block.typeId}-${block.startSlot}`}
                        block={block}
                        dayIndex={dayIndex}
                        slots={slots}
                        course={course}
                        onRemoveBlock={onRemoveBlock}
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