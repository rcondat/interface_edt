import { getTeacherAvailabilityIssue, isDayClosed } from "./teachers";

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
  db,
  activeGrid,
  dayIndex,
  slotIndex,
  weekDays,
  slots,
  courseType,
  draggedBlock,
  preselectedTeacherId,
}) {
  const occupied = Boolean(activeGrid?.[dayIndex]?.[slotIndex]);

  const day = weekDays[dayIndex];
  const slot = slots[slotIndex];

  if (!day || !slot) {
    return {
      occupied,
      teacherUnavailable: false,
      dayClosed: false,
    };
  }

  const dayClosed = isDayClosed(db, day.id);

  const teacherIssue =
    courseType && !dayClosed
      ? getTeacherAvailabilityIssue({
          db,
          courseType,
          block: draggedBlock,
          dayId: day.id,
          startSlotId: slot.id,
          durationSlots: 1,
          preselectedTeacherId,
        })
      : null;

  return {
    occupied,
    teacherUnavailable: Boolean(teacherIssue),
    dayClosed,
  };
}

export function getPreviewState({
  db,
  activeGrid,
  previewAnchor,
  currentDayIndex,
  currentSlotIndex,
  previewDuration,
  ignoreBlock,
  slotCount,
  weekDays,
  slots,
  courseType,
  draggedBlock,
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

  const day = weekDays[anchorDayIndex];
  const slot = slots[anchorSlotIndex];

  if (!day || !slot) {
    return { isPreview: true, isValid: false, reason: "invalid-target" };
  }

  if (isDayClosed(db, day.id)) {
    return { isPreview: true, isValid: false, reason: "day-closed" };
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
    db,
    courseType,
    block: draggedBlock,
    dayId: day.id,
    startSlotId: slot.id,
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
  db,
  activeGrid,
  dayIndex,
  slotIndex,
  durationSlots,
  ignoreBlock,
  slotCount,
  weekDays,
  slots,
  courseType,
  draggedBlock,
  preselectedTeacherId,
}) {
  if (slotIndex + durationSlots > slotCount) {
    return { ok: false, reason: "out-of-day" };
  }

  const day = weekDays[dayIndex];
  const slot = slots[slotIndex];

  if (!day || !slot) {
    return { ok: false, reason: "invalid-target" };
  }

  if (isDayClosed(db, day.id)) {
    return { ok: false, reason: "day-closed" };
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
    db,
    courseType,
    block: draggedBlock,
    dayId: day.id,
    startSlotId: slot.id,
    durationSlots,
    preselectedTeacherId,
  });

  if (teacherIssue) {
    return { ok: false, reason: "teacher-unavailable" };
  }

  return { ok: true };
}