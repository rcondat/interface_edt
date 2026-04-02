export function getIgnoreBlock(activeDragItem, draggedCourse) {
  if (activeDragItem?.source !== "grid" || !draggedCourse) {
    return null;
  }

  return {
    dayIndex: activeDragItem.fromDayIndex,
    startSlot: activeDragItem.fromStartSlot,
    durationSlots: draggedCourse.durationSlots,
  };
}

export function getPreviewState({
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