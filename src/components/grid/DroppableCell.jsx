import { useDroppable } from "@dnd-kit/core";
import { getCellConstraintState, getPreviewState } from "../../planner/preview";

export default function DroppableCell({
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
  teachers,
  courseType,
  draggedBlock,
  activeWeek,
  isDragging,
  preselectedTeacherId,
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

  if (isDragging) {
    const constraintState = getCellConstraintState({
      activeGrid,
      dayIndex,
      slotIndex,
      teachers,
      courseType,
      draggedBlock,
      activeWeek,
      preselectedTeacherId,
    });

    const isIgnoredSlot =
      ignoreBlock &&
      dayIndex === ignoreBlock.dayIndex &&
      slotIndex >= ignoreBlock.startSlot &&
      slotIndex < ignoreBlock.startSlot + ignoreBlock.durationSlots;

    if (!isIgnoredSlot && constraintState.occupied) {
      className += " grid-cell-constraint-occupied";
    }

    if (constraintState.teacherUnavailable) {
      className += " grid-cell-constraint-teacher";
    }
  }

  const previewState = getPreviewState({
    activeGrid,
    previewAnchor,
    currentDayIndex: dayIndex,
    currentSlotIndex: slotIndex,
    previewDuration,
    ignoreBlock,
    slotCount,
    teachers,
    courseType,
    draggedBlock,
    activeWeek,
    preselectedTeacherId,
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