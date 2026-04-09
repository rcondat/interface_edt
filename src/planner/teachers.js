function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}


export function getTeacherById(teachers, teacherId) {
  return teachers.find((teacher) => teacher.id === teacherId) ?? null;
}

export function getTeacherMap(teachers) {
  return byId(teachers);
}

export function getCourseTeachers(courseType, teachers) {
  if (!courseType?.teacherIds?.length) return [];
  const teacherMap = getTeacherMap(teachers);

  return courseType.teacherIds
    .map((teacherId) => teacherMap[teacherId])
    .filter(Boolean);
}

export function getBlockAssignedTeacher(block, teachers) {
  if (!block?.assignedTeacherId) return null;
  return getTeacherById(teachers, block.assignedTeacherId);
}

function getWeekById(db, weekId) {
  return db.weeks.find((week) => week.id === weekId) ?? null;
}

function getDayById(db, dayId) {
  return db.days.find((day) => day.id === dayId) ?? null;
}

function rangesOverlap(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA;
}

function getSlotIndexMap(db) {
  return Object.fromEntries(
    [...db.slots]
      .sort((a, b) => a.index - b.index)
      .map((slot, index) => [slot.id, index])
  );
}

function getRequirementMap(db) {
  return Object.fromEntries((db.requirements ?? []).map((req) => [req.id, req]));
}

function getTeacherScheduleConflict({
  db,
  teacherId,
  dayId,
  startSlotId,
  durationSlots,
  ignoredSessionRequirementId = null,
  ignoredSessionStartSlot = null,
}) {
  if (!teacherId) return null;

  const slotIndexMap = getSlotIndexMap(db);
  const requirementMap = getRequirementMap(db);

  const startIndex = slotIndexMap[startSlotId];
  if (startIndex == null) return null;

  return (
    db.sessionInstances.find((session) => {
      if (!session.scheduledDayId || !session.startSlotId) return false;
      if (session.scheduledDayId !== dayId) return false;
      if (session.teacherId !== teacherId) return false;

      if (
        ignoredSessionRequirementId &&
        session.requirementId === ignoredSessionRequirementId &&
        session.startSlotId === ignoredSessionStartSlot
      ) {
        return false;
      }

      const sessionStartIndex = slotIndexMap[session.startSlotId];
      if (sessionStartIndex == null) return false;

      const requirement = requirementMap[session.requirementId];
      if (!requirement) return false;

      return rangesOverlap(
        startIndex,
        durationSlots,
        sessionStartIndex,
        requirement.durationSlots
      );
    }) ?? null
  );
}

function getWeekForDay(db, dayId) {
  const day = getDayById(db, dayId);
  if (!day) return null;
  return getWeekById(db, day.weekId);
}

function overlaps(startIndexA, endIndexA, startIndexB, endIndexB) {
  return startIndexA < endIndexB && startIndexB < endIndexA;
}

function matchesConstraintTimeScope({
  constraint,
  day,
  week,
  slotIndexMap,
  startSlotId,
  durationSlots,
}) {
  const blockStart = slotIndexMap[startSlotId];
  const blockEnd = blockStart + durationSlots;

  const constraintStart =
    constraint.startSlotId != null ? slotIndexMap[constraint.startSlotId] : null;

  const constraintEnd =
    constraint.endSlotId != null
      ? slotIndexMap[constraint.endSlotId] + 1
      : null;

  const hasSlotRange = constraintStart != null && constraintEnd != null;

  switch (constraint.timeScopeType) {
    case "weekly":
      return (
        day.weekdayIndex === constraint.dayIndex &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "specific-weeks":
      return (
        constraint.weekIds?.includes(week.id) &&
        day.weekdayIndex === constraint.dayIndex &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "date-range":
      return (
        day.date >= constraint.startDate &&
        day.date <= constraint.endDate &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "specific-date-time":
      return (
        day.date === constraint.date &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "day":
      return constraint.dayId === day.id;

    case "slot":
      return (
        constraint.dayId === day.id &&
        constraint.slotId === startSlotId
      );

    default:
      return false;
  }
}

export function getConstraintsForEntity(db, entityType, entityId) {
  return db.constraints.filter(
    (constraint) =>
      constraint.entityType === entityType &&
      constraint.entityId === entityId
  );
}

export function getGlobalConstraints(db) {
  return db.constraints.filter((constraint) => constraint.entityType === "global");
}

function getPromotionById(db, promotionId) {
  return db.promotions.find((promotion) => promotion.id === promotionId) ?? null;
}

export function isPromotionUnavailable({
  db,
  promotionId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!promotionId) return false;

  const promotionConstraints = getConstraintsForEntity(db, "promotion", promotionId);
  const day = getDayById(db, dayId);
  const week = getWeekForDay(db, dayId);
  const slotIndexMap = getSlotIndexMap(db);
  const promotion = getPromotionById(db, promotionId);

  if (!day || !week || !(startSlotId in slotIndexMap)) {
    return false;
  }

  if (promotion?.startDate && day.date < promotion.startDate) {
    return true;
  }

  if (promotion?.endDate && day.date > promotion.endDate) {
    return true;
  }

  return promotionConstraints.some((constraint) =>
    matchesConstraintTimeScope({
      constraint,
      day,
      week,
      slotIndexMap,
      startSlotId,
      durationSlots,
    })
  );
}

export function getPromotionAvailabilityIssue({
  db,
  courseType,
  dayId,
  startSlotId,
  durationSlots,
}) {
  const promotionIds = courseType?.promotionIds ?? [];

  if (!promotionIds.length) {
    return null;
  }

  const blockedPromotionId = promotionIds.find((promotionId) =>
    isPromotionUnavailable({
      db,
      promotionId,
      dayId,
      startSlotId,
      durationSlots,
    })
  );

  if (!blockedPromotionId) {
    return null;
  }

  return {
    promotionId: blockedPromotionId,
    reason: "promotion-unavailable",
  };
}

export function isTeacherUnavailable({
  db,
  teacherId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!teacherId) return false;

  const teacherConstraints = getConstraintsForEntity(db, "teacher", teacherId);
  const day = getDayById(db, dayId);
  const week = getWeekForDay(db, dayId);
  const slotIndexMap = getSlotIndexMap(db);

  if (!day || !week || !(startSlotId in slotIndexMap)) {
    return false;
  }

  return teacherConstraints.some((constraint) =>
    matchesConstraintTimeScope({
      constraint,
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
  if (!day) return false;
  if (day.isHoliday || day.isClosed) return true;

  return getGlobalConstraints(db).some(
    (constraint) =>
      constraint.timeScopeType === "day" &&
      constraint.dayId === dayId
  );
}

export function isTeacherAvailable(args) {
  return !isTeacherUnavailable(args);
}

export function getEffectiveTeacherIdForBlockOrCourse(
  block,
  courseType,
  preselectedTeacherId = null
) {
  if (block?.assignedTeacherId) {
    return block.assignedTeacherId;
  }

  if (preselectedTeacherId) {
    return preselectedTeacherId;
  }

  if (courseType?.teacherIds?.length === 1) {
    return courseType.teacherIds[0];
  }

  return null;
}

export function getTeacherAvailabilityIssue({
  db,
  courseType,
  block,
  dayId,
  startSlotId,
  durationSlots,
  preselectedTeacherId,
}) {
  const candidateTeacherIds = preselectedTeacherId
    ? [preselectedTeacherId]
    : courseType?.teacherIds?.length === 1
      ? [courseType.teacherIds[0]]
      : [];

  if (!candidateTeacherIds.length) {
    return null;
  }

  const ignoredSessionRequirementId = block?.typeId ?? null;
  const ignoredSessionStartSlot =
    typeof block?.startSlot === "number"
      ? db.slots.find((slot) => slot.index === block.startSlot)?.id ?? null
      : null;

  const unavailableTeacherId = candidateTeacherIds.find((teacherId) => {
    const declaredUnavailable = isTeacherUnavailable({
      db,
      teacherId,
      dayId,
      startSlotId,
      durationSlots,
    });

    if (declaredUnavailable) {
      return true;
    }

    const scheduleConflict = getTeacherScheduleConflict({
      db,
      teacherId,
      dayId,
      startSlotId,
      durationSlots,
      ignoredSessionRequirementId,
      ignoredSessionStartSlot,
    });

    return Boolean(scheduleConflict);
  });

  if (!unavailableTeacherId) {
    return null;
  }

  return {
    teacherId: unavailableTeacherId,
    reason: "teacher-unavailable",
  };
}

export function getTeacherOptionsForBlock({
  db,
  courseType,
  dayId,
  startSlotId,
  durationSlots,
}) {
  const linkedTeachers = getCourseTeachers(courseType, db.teachers);

  return linkedTeachers.map((teacher) => ({
    teacher,
    available: isTeacherAvailable({
      db,
      teacherId: teacher.id,
      dayId,
      startSlotId,
      durationSlots,
    }),
  }));
}