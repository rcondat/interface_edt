import { cloneAssignments, ensureWeekGrid } from "./model";

export function placeCourse({
  assignments,
  weekId,
  dayIndex,
  slotIndex,
  courseType,
  slotCount,
  dayCount,
  assignedTeacherId = null,
}) {
  const next = cloneAssignments(assignments);
  const week = ensureWeekGrid(next, weekId, dayCount, slotCount);

  if (slotIndex + courseType.durationSlots > slotCount) {
    return { ok: false, reason: "Le créneau dépasse la fin de journée." };
  }

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    if (week[dayIndex][slotIndex + i]) {
      return { ok: false, reason: "Des cases sont déjà occupées." };
    }
  }

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    week[dayIndex][slotIndex + i] = {
      typeId: courseType.id,
      segment: i,
      startSlot: slotIndex,
      durationSlots: courseType.durationSlots,
      assignedTeacherId,
    };
  }

  return { ok: true, assignments: next };
}

export function removeCourse({
  assignments,
  weekId,
  dayIndex,
  startSlot,
  courseType,
  dayCount,
  slotCount,
}) {
  const next = cloneAssignments(assignments);
  const week = ensureWeekGrid(next, weekId, dayCount, slotCount);

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    week[dayIndex][startSlot + i] = null;
  }

  return { ok: true, assignments: next };
}

export function moveCourse({
  assignments,
  weekId,
  fromDayIndex,
  fromStartSlot,
  toDayIndex,
  toSlotIndex,
  courseType,
  dayCount,
  slotCount,
}) {
  const next = cloneAssignments(assignments);
  const week = ensureWeekGrid(next, weekId, dayCount, slotCount);

  const originalBlock = week[fromDayIndex][fromStartSlot];
  const assignedTeacherId = originalBlock?.assignedTeacherId ?? null;

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    week[fromDayIndex][fromStartSlot + i] = null;
  }

  if (toSlotIndex + courseType.durationSlots > slotCount) {
    return { ok: false, reason: "Le créneau dépasse la fin de journée." };
  }

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    if (week[toDayIndex][toSlotIndex + i]) {
      return { ok: false, reason: "Des cases sont déjà occupées." };
    }
  }

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    week[toDayIndex][toSlotIndex + i] = {
      typeId: courseType.id,
      segment: i,
      startSlot: toSlotIndex,
      durationSlots: courseType.durationSlots,
      assignedTeacherId,
    };
  }

  return { ok: true, assignments: next };
}

export function assignTeacherToBlock({
  assignments,
  weekId,
  dayIndex,
  startSlot,
  durationSlots,
  teacherId,
  dayCount,
  slotCount,
}) {
  const next = cloneAssignments(assignments);
  const week = ensureWeekGrid(next, weekId, dayCount, slotCount);

  for (let i = 0; i < durationSlots; i += 1) {
    const cell = week[dayIndex][startSlot + i];
    if (!cell) continue;

    week[dayIndex][startSlot + i] = {
      ...cell,
      assignedTeacherId: teacherId,
    };
  }

  return { ok: true, assignments: next };
}