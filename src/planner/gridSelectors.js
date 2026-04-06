import { SLOT_MINUTES } from "./constants";

export function durationLabel(durationSlots, slotMinutes = SLOT_MINUTES) {
  const minutes = durationSlots * slotMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins === 0 ? `${hours}h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

export function getCourseTypesById(courseTypes) {
  return Object.fromEntries(courseTypes.map((course) => [course.id, course]));
}

export function getActiveGrid(assignments, activeWeekId) {
  return assignments[activeWeekId] ?? {};
}

export function getMergedBlocksForDay(daySlots, courseTypesById) {
  const blocks = [];
  let slot = 0;

  while (slot < daySlots.length) {
    const cell = daySlots[slot];

    if (!cell || cell.segment !== 0) {
      slot += 1;
      continue;
    }

    const course = courseTypesById[cell.typeId];

    if (!course) {
      slot += 1;
      continue;
    }

    blocks.push({
      typeId: cell.typeId,
      startSlot: slot,
      durationSlots: course.durationSlots,
      assignedTeacherId: cell.assignedTeacherId ?? null,
    });

    slot += course.durationSlots;
  }

  return blocks;
}