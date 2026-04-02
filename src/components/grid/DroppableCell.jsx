import { useDroppable } from "@dnd-kit/core";
import { getPreviewState } from "../../planner/preview";

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

  const previewState = getPreviewState({
    activeGrid,
    previewAnchor,
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