import { SLOT_MINUTES } from "./constants";

export function durationLabel(durationSlots, slotMinutes = SLOT_MINUTES) {
  const minutes = durationSlots * slotMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

export function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function getSemester(db, semesterId) {
  return db.semesters.find((item) => item.id === semesterId) ?? db.semesters[0];
}

export function getWeekDays(db, weekId) {
  return db.days
    .filter((day) => day.weekId === weekId)
    .sort((a, b) => a.weekdayIndex - b.weekdayIndex);
}

export function getSlotsView(db) {
  return db.slots
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((slot) => ({
      id: slot.id,
      label: slot.label,
      start: slot.startTime,
      end: slot.endTime,
      index: slot.index,
    }));
}

export function getWeek(db, weekId) {
  return db.weeks.find((item) => item.id === weekId) ?? db.weeks[0];
}

export function getDaysForWeek(db, weekId) {
  return getWeekDays(db, weekId);
}

export function getSlots(db) {
  return [...db.slots].sort((a, b) => a.index - b.index);
}

export function getTeachers(db) {
  return db.teachers;
}

export function getPromotions(db) {
  return [...(db.promotions ?? [])].sort((a, b) =>
    String(a.label ?? "").localeCompare(String(b.label ?? ""), "fr")
  );
}

export function getRequirementsView(db) {
  const ecMap = byId(db.ecs);
  const promotionMap = byId(db.promotions ?? []);
  const groupMap = byId(db.groups ?? []);

  return db.requirements.map((requirement) => {
    const ec = ecMap[requirement.ecId];

    const directPromotionIds = requirement.targetPromotionIds ?? [];
    const promotionIdsFromGroups = (requirement.targetGroupIds ?? [])
      .map((groupId) => groupMap[groupId]?.promotionId)
      .filter(Boolean);

    const promotionIds = [...new Set([...directPromotionIds, ...promotionIdsFromGroups])];

    const promotionLabels = promotionIds
      .map((promotionId) => promotionMap[promotionId]?.label)
      .filter(Boolean);

    const groupLabels = (requirement.targetGroupIds ?? [])
      .map((groupId) => groupMap[groupId]?.label)
      .filter(Boolean);

    return {
      id: requirement.id,
      subject: ec.label,
      category: requirement.type,
      label: `${ec.code} · ${requirement.type}`,
      durationSlots: requirement.durationSlots,
      totalCount: requirement.occurrencesRequired,
      color: ec.color,
      teacherIds: requirement.possibleTeacherIds,
      promotionIds,
      promotionLabels,
      promotionLabel: promotionLabels.join(", "),
      groupIds: requirement.targetGroupIds ?? [],
      groupLabels,
    };
  });
}

export function getPlacedCountByRequirement(db) {
  const result = {};
  db.sessionInstances.forEach((session) => {
    if (session.scheduledDayId && session.startSlotId) {
      result[session.requirementId] = (result[session.requirementId] ?? 0) + 1;
    }
  });
  return result;
}

export function groupPaletteFromDb(db) {
  const placed = getPlacedCountByRequirement(db);
  const requirements = getRequirementsView(db);
  const groups = {};

  requirements.forEach((course) => {
    const remaining = course.totalCount - (placed[course.id] ?? 0);
    if (remaining <= 0) return;

    if (!groups[course.category]) groups[course.category] = [];
    groups[course.category].push({ ...course, remaining });
  });

  return groups;
}

export function getWeeksView(db, semesterId) {
  const semester = getSemester(db, semesterId);

  return semester.weekIds.map((weekId) => {
    const week = getWeek(db, weekId);
    return {
      id: week.id,
      label: week.label,
      start: week.startDate,
      end: week.endDate,
    };
  });
}

export function getSemesterView(db, semesterId) {
  const semester = getSemester(db, semesterId);

  return {
    id: semester.id,
    name: semester.label,
    label: semester.label,
    weeks: getWeeksView(db, semester.id),
    slots: getSlotsView(db),
  };
}

export function getWeekDaysView(db, weekId) {
  return getDaysForWeek(db, weekId).map((day) =>
    day.isHoliday || day.isClosed
      ? `${day.weekdayLabel} · fermé`
      : day.weekdayLabel
  );
}

export function buildAssignmentsView(db, weekId) {
  const days = getDaysForWeek(db, weekId);
  const slots = getSlots(db);
  const dayIndexById = Object.fromEntries(days.map((day, index) => [day.id, index]));
  const slotIndexById = Object.fromEntries(slots.map((slot, index) => [slot.id, index]));
  const requirementMap = byId(db.requirements);

  const weekGrid = {};
  days.forEach((_, dayIndex) => {
    weekGrid[dayIndex] = Array.from({ length: slots.length }, () => []);
  });

  db.sessionInstances.forEach((session) => {
    if (!session.scheduledDayId || !session.startSlotId) return;
    if (!(session.scheduledDayId in dayIndexById)) return;

    const dayIndex = dayIndexById[session.scheduledDayId];
    const slotIndex = slotIndexById[session.startSlotId];
    const requirement = requirementMap[session.requirementId];
    if (!requirement) return;

    for (let i = 0; i < requirement.durationSlots; i += 1) {
      const targetSlotIndex = slotIndex + i;
      if (!weekGrid[dayIndex][targetSlotIndex]) {
        weekGrid[dayIndex][targetSlotIndex] = [];
      }

      weekGrid[dayIndex][targetSlotIndex].push({
        sessionInstanceId: session.id,
        typeId: requirement.id,
        segment: i,
        startSlot: slotIndex,
        durationSlots: requirement.durationSlots,
        assignedTeacherId: session.teacherId ?? null,
      });
    }
  });

  return { [weekId]: weekGrid };
}

export function getSelectedSession(db, weekId, dayIndex, startSlot) {
  const days = getDaysForWeek(db, weekId);
  const slots = getSlots(db);
  const day = days[dayIndex];
  const slot = slots[startSlot];
  if (!day || !slot) return null;

  return (
    db.sessionInstances.find(
      (session) =>
        session.scheduledDayId === day.id && session.startSlotId === slot.id
    ) ?? null
  );
}

export function getPaletteGroups(db) {
  const placed = getPlacedCountByRequirement(db);
  const requirements = getRequirementsView(db);
  const groups = {};

  requirements.forEach((course) => {
    const remaining = course.totalCount - (placed[course.id] ?? 0);

    if (remaining <= 0) return;

    const groupKey = course.subject;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push({
      ...course,
      remaining,
    });
  });

  Object.values(groups).forEach((items) => {
    items.sort((a, b) => a.category.localeCompare(b.category, "fr"));
  });

  return groups;
}