import {
  getPromotionAvailabilityIssue,
  getTeacherAvailabilityIssue,
  isDayClosed,
} from "./teachers";

function hasPromotionConflict(courseType, existingCourseType) {
  const currentPromotionIds = courseType?.promotionIds ?? [];
  const existingPromotionIds = existingCourseType?.promotionIds ?? [];

  if (!currentPromotionIds.length || !existingPromotionIds.length) {
    return true;
  }

  return currentPromotionIds.some((promotionId) =>
    existingPromotionIds.includes(promotionId)
  );
}

function isIgnoredEntry({
  entry,
  ignoreBlock,
  dayIndex,
  draggedBlock,
}) {
  if (!ignoreBlock) return false;
  if (dayIndex !== ignoreBlock.dayIndex) return false;

  return entry.sessionInstanceId === draggedBlock?.sessionInstanceId;
}

function findConflictingEntry({
  cellEntries,
  dayIndex,
  ignoreBlock,
  draggedBlock,
  courseType,
  courseTypesById,
}) {
  return cellEntries.find((entry) => {
    if (
      isIgnoredEntry({
        entry,
        ignoreBlock,
        dayIndex,
        draggedBlock,
      })
    ) {
      return false;
    }

    const entryCourseType = courseTypesById?.[entry.typeId];
    return hasPromotionConflict(courseType, entryCourseType);
  });
}

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
  courseTypesById,
  ignoreBlock,
}) {
  const cellEntries = activeGrid?.[dayIndex]?.[slotIndex] ?? [];

  const conflictingEntry = courseType
    ? findConflictingEntry({
        cellEntries,
        dayIndex,
        ignoreBlock,
        draggedBlock,
        courseType,
        courseTypesById,
      })
    : null;

  const occupied = Boolean(conflictingEntry);

  const day = weekDays[dayIndex];
  const slot = slots[slotIndex];

  if (!day || !slot) {
    return {
      occupied,
      teacherUnavailable: false,
      promotionUnavailable: false,
      dayClosed: false,
    };
  }

  const dayClosed = isDayClosed(db, day.id);

  const promotionIssue =
    courseType && !dayClosed
      ? getPromotionAvailabilityIssue({
          db,
          courseType,
          dayId: day.id,
          startSlotId: slot.id,
          durationSlots: 1,
        })
      : null;

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
    promotionUnavailable: Boolean(promotionIssue),
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
  courseTypesById,
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

  const promotionIssue = getPromotionAvailabilityIssue({
    db,
    courseType,
    dayId: day.id,
    startSlotId: slot.id,
    durationSlots: previewDuration,
  });

  if (promotionIssue) {
    return {
      isPreview: true,
      isValid: false,
      reason: promotionIssue.reason,
    };
  }

  for (let i = 0; i < previewDuration; i += 1) {
    const inspectedSlot = anchorSlotIndex + i;
    const cellEntries = activeGrid[anchorDayIndex]?.[inspectedSlot] ?? [];

    const conflictingEntry = findConflictingEntry({
      cellEntries,
      dayIndex: anchorDayIndex,
      ignoreBlock,
      draggedBlock,
      courseType,
      courseTypesById,
    });

    if (conflictingEntry) {
      return { isPreview: true, isValid: false, reason: "overlap" };
    }
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
  courseTypesById,
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

  const promotionIssue = getPromotionAvailabilityIssue({
    db,
    courseType,
    dayId: day.id,
    startSlotId: slot.id,
    durationSlots,
  });

  if (promotionIssue) {
    return { ok: false, reason: "promotion-unavailable" };
  }

  for (let i = 0; i < durationSlots; i += 1) {
    const inspectedSlot = slotIndex + i;
    const cellEntries = activeGrid[dayIndex]?.[inspectedSlot] ?? [];

    const conflictingEntry = findConflictingEntry({
      cellEntries,
      dayIndex,
      ignoreBlock,
      draggedBlock,
      courseType,
      courseTypesById,
    });

    if (conflictingEntry) {
      return { ok: false, reason: "overlap" };
    }
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