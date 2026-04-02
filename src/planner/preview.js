import { getTeacherAvailabilityIssue } from "./teachers";

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

export function getCellConstraintState({
  activeGrid,
  dayIndex,
  slotIndex,
  teachers,
  courseType,
  draggedBlock,
  activeWeek,
  preselectedTeacherId,
}) {
  const occupied = Boolean(activeGrid?.[dayIndex]?.[slotIndex]);

  const teacherIssue =
    courseType && activeWeek
      ? getTeacherAvailabilityIssue({
          teachers,
          courseType,
          block: draggedBlock,
          week: activeWeek,
          dayIndex,
          startSlot: slotIndex,
          durationSlots: 1,
          preselectedTeacherId,
        })
      : null;

  return {
    occupied,
    teacherUnavailable: Boolean(teacherIssue),
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
  teachers,
  courseType,
  draggedBlock,
  activeWeek,
  preselectedTeacherId,
}) {
  if (!previewAnchor || previewDuration <= 0) {
    return { isPreview: false, isValid: false, reason: null };
  }

  const { dayIndex: anchorDayIndex, slotIndex: anchorSlotIndex } = previewAnchor;

  if (
    currentDayIndex !== anchorDayIndex ||
    currentSlotIndex < anchorSlotIndex ||
    currentSlotIndex >= anchorSlotIndex + previewDuration
  ) {
    return { isPreview: false, isValid: false, reason: null };
  }

  if (anchorSlotIndex + previewDuration > slotCount) {
    return { isPreview: true, isValid: false, reason: "out-of-day" };
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

    return { isPreview: true, isValid: false, reason: "overlap" };
  }

  const teacherIssue = getTeacherAvailabilityIssue({
    teachers,
    courseType,
    block: draggedBlock,
    week: activeWeek,
    dayIndex: anchorDayIndex,
    startSlot: anchorSlotIndex,
    durationSlots: previewDuration,
    preselectedTeacherId,
  });

  if (teacherIssue) {
    return {
      isPreview: true,
      isValid: false,
      reason: teacherIssue.reason,
    };
  }

  return { isPreview: true, isValid: true, reason: null };
}

export function validateDrop({
  activeGrid,
  dayIndex,
  slotIndex,
  durationSlots,
  ignoreBlock,
  slotCount,
  teachers,
  courseType,
  draggedBlock,
  activeWeek,
  preselectedTeacherId,
}) {
  if (slotIndex + durationSlots > slotCount) {
    return { ok: false, reason: "out-of-day" };
  }

  for (let i = 0; i < durationSlots; i += 1) {
    const inspectedSlot = slotIndex + i;
    const cell = activeGrid[dayIndex]?.[inspectedSlot];

    if (!cell) continue;

    if (
      ignoreBlock &&
      dayIndex === ignoreBlock.dayIndex &&
      inspectedSlot >= ignoreBlock.startSlot &&
      inspectedSlot < ignoreBlock.startSlot + ignoreBlock.durationSlots
    ) {
      continue;
    }

    return { ok: false, reason: "overlap" };
  }

  const teacherIssue = getTeacherAvailabilityIssue({
    teachers,
    courseType,
    block: draggedBlock,
    week: activeWeek,
    dayIndex,
    startSlot: slotIndex,
    durationSlots,
    preselectedTeacherId,
  });

  if (teacherIssue) {
    return { ok: false, reason: "teacher-unavailable" };
  }

  return { ok: true };
}