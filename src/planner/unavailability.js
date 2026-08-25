function overlaps(startIndexA, endIndexA, startIndexB, endIndexB) {
  return startIndexA < endIndexB && startIndexB < endIndexA;
}

export function createUnavailability({
  entityType,
  entityId,
  timeScopeType,
  dayIndex = null,
  startSlotId = null,
  endSlotId = null,
  weekIds = [],
  startDate = null,
  endDate = null,
  date = null,
  dayId = null,
  slotId = null,
  label = "",
}) {
  return {
    id: `unavailability-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType,
    entityId,
    timeScopeType,
    dayIndex,
    startSlotId,
    endSlotId,
    weekIds,
    startDate,
    endDate,
    date,
    dayId,
    slotId,
    label,
  };
}

export function getUnavailabilityEntries(db) {
  return db.unavailabilities ?? db.constraints ?? [];
}

export function getEntityUnavailabilities(db, entityType, entityId) {
  return getUnavailabilityEntries(db).filter(
    (entry) => entry.entityType === entityType && entry.entityId === entityId
  );
}

export function getGlobalUnavailabilities(db) {
  return getUnavailabilityEntries(db).filter((entry) => entry.entityType === "global");
}

export function getWeekById(db, weekId) {
  return db.weeks.find((week) => week.id === weekId) ?? null;
}

export function getDayById(db, dayId) {
  return db.days.find((day) => day.id === dayId) ?? null;
}

export function getWeekForDay(db, dayId) {
  const day = getDayById(db, dayId);
  return day ? getWeekById(db, day.weekId) : null;
}

export function getSlotIndexMap(db) {
  return Object.fromEntries(
    [...db.slots]
      .sort((a, b) => a.index - b.index)
      .map((slot, index) => [slot.id, index])
  );
}

export function matchesUnavailabilityTimeScope({
  unavailability,
  day,
  week,
  slotIndexMap,
  startSlotId,
  durationSlots,
}) {
  const blockStart = slotIndexMap[startSlotId];
  const blockEnd = blockStart + durationSlots;
  const ruleStart =
    unavailability.startSlotId != null ? slotIndexMap[unavailability.startSlotId] : null;
  const ruleEnd =
    unavailability.endSlotId != null ? slotIndexMap[unavailability.endSlotId] + 1 : null;
  const hasSlotRange = ruleStart != null && ruleEnd != null;

  switch (unavailability.timeScopeType) {
    case "weekly":
      return (
        day.weekdayIndex === unavailability.dayIndex &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, ruleStart, ruleEnd))
      );

    case "specific-weeks":
      return (
        unavailability.weekIds?.includes(week.id) &&
        day.weekdayIndex === unavailability.dayIndex &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, ruleStart, ruleEnd))
      );

    case "date-range":
      return (
        day.date >= unavailability.startDate &&
        day.date <= unavailability.endDate &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, ruleStart, ruleEnd))
      );

    case "specific-date-time":
      return (
        day.date === unavailability.date &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, ruleStart, ruleEnd))
      );

    case "day":
      return unavailability.dayId === day.id;

    case "slot":
      return unavailability.dayId === day.id && unavailability.slotId === startSlotId;

    default:
      return false;
  }
}

export function isEntityUnavailable({
  db,
  entityType,
  entityId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!entityId) {
    return false;
  }

  const day = getDayById(db, dayId);
  const week = getWeekForDay(db, dayId);
  const slotIndexMap = getSlotIndexMap(db);
  const unavailabilities = getEntityUnavailabilities(db, entityType, entityId);

  if (!day || !week || !(startSlotId in slotIndexMap)) {
    return false;
  }

  return unavailabilities.some((unavailability) =>
    matchesUnavailabilityTimeScope({
      unavailability,
      day,
      week,
      slotIndexMap,
      startSlotId,
      durationSlots,
    })
  );
}

export function isDayClosed(db, dayId) {
  const day = getDayById(db, dayId);

  if (!day) {
    return false;
  }

  if (day.isHoliday || day.isClosed) {
    return true;
  }

  return getGlobalUnavailabilities(db).some(
    (unavailability) =>
      unavailability.timeScopeType === "day" && unavailability.dayId === dayId
  );
}
