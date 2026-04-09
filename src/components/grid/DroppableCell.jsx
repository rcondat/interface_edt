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
  db,
  weekDays,
  slots,
  courseType,
  draggedBlock,
  isDragging,
  preselectedTeacherId,
  courseTypesById
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
      db,
      activeGrid,
      dayIndex,
      slotIndex,
      weekDays,
      slots,
      courseType,
      draggedBlock,
      preselectedTeacherId,
      courseTypesById,
      ignoreBlock,
    });

    const isIgnoredSlot =
      ignoreBlock &&
      dayIndex === ignoreBlock.dayIndex &&
      slotIndex >= ignoreBlock.startSlot &&
      slotIndex < ignoreBlock.startSlot + ignoreBlock.durationSlots;

    if (constraintState.dayClosed) {
      className += " grid-cell-constraint-occupied";
    }

    if (!isIgnoredSlot && constraintState.occupied) {
      className += " grid-cell-constraint-occupied";
    }

    if (constraintState.teacherUnavailable || constraintState.promotionUnavailable) {
      className += " grid-cell-constraint-teacher";
    }
  }

  const previewState = getPreviewState({
    db,
    activeGrid,
    previewAnchor,
    currentDayIndex: dayIndex,
    currentSlotIndex: slotIndex,
    previewDuration,
    ignoreBlock,
    slotCount,
    weekDays,
    slots,
    courseType,
    draggedBlock,
    preselectedTeacherId,
    courseTypesById,
    ignoreBlock,
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
        selectedCourseTypeId
          ? `Placer sur ${day} - ${slot.label}`
          : `${day} - ${slot.label}`
      }
    />
  );
}