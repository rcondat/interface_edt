import {
  getAudienceFromCourseType,
  getAudienceFromEntry,
  audiencesConflict,
} from "./audience";
import {
  getPromotionAvailabilityIssue,
  getTeacherAvailabilityIssue,
  isDayClosed,
} from "./teachers";
import { getRoomAvailabilityIssue } from "./rooms";

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
  db,
  cellEntries,
  dayIndex,
  ignoreBlock,
  draggedBlock,
  courseType,
}) {
  const draggedAudience = getAudienceFromCourseType(courseType);

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

    return audiencesConflict(db, draggedAudience, getAudienceFromEntry(entry));
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
  ignoreBlock,
}) {
  const cellEntries = activeGrid?.[dayIndex]?.[slotIndex] ?? [];

  const conflictingEntry = courseType
    ? findConflictingEntry({
        db,
        cellEntries,
        dayIndex,
        ignoreBlock,
        draggedBlock,
        courseType,
      })
    : null;

  const occupied = Boolean(conflictingEntry);

  const day = weekDays[dayIndex];
  const slot = slots[slotIndex];

  if (!day || !slot) {
    return {
      occupied,
      teacherUnavailable: false,
      roomUnavailable: false,
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

  const roomIssue =
    courseType && draggedBlock?.assignedRoomId && !dayClosed
      ? getRoomAvailabilityIssue({
          db,
          courseType,
          block: draggedBlock,
          roomId: draggedBlock.assignedRoomId,
          dayId: day.id,
          startSlotId: slot.id,
          durationSlots: 1,
        })
      : null;

  return {
    occupied,
    teacherUnavailable: Boolean(teacherIssue),
    roomUnavailable: Boolean(roomIssue),
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
      db,
      cellEntries,
      dayIndex: anchorDayIndex,
      ignoreBlock,
      draggedBlock,
      courseType,
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

  if (draggedBlock?.assignedRoomId) {
    const roomIssue = getRoomAvailabilityIssue({
      db,
      courseType,
      block: draggedBlock,
      roomId: draggedBlock.assignedRoomId,
      dayId: day.id,
      startSlotId: slot.id,
      durationSlots: previewDuration,
    });

    if (roomIssue) {
      return {
        isPreview: true,
        isValid: false,
        reason: roomIssue.reason,
      };
    }
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
      db,
      cellEntries,
      dayIndex,
      ignoreBlock,
      draggedBlock,
      courseType,
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

  if (draggedBlock?.assignedRoomId) {
    const roomIssue = getRoomAvailabilityIssue({
      db,
      courseType,
      block: draggedBlock,
      roomId: draggedBlock.assignedRoomId,
      dayId: day.id,
      startSlotId: slot.id,
      durationSlots,
    });

    if (roomIssue) {
      return { ok: false, reason: "room-unavailable" };
    }
  }

  return { ok: true };
}
