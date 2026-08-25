import { getRequirementForSession } from "./audience";
import {
  getDayById,
  getEntityUnavailabilities,
  getGlobalUnavailabilities,
  getSlotIndexMap,
  getWeekForDay,
  isDayClosed,
  isEntityUnavailable,
  matchesUnavailabilityTimeScope,
} from "./unavailability";

function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

function getPromotionById(db, promotionId) {
  return db.promotions.find((promotion) => promotion.id === promotionId) ?? null;
}

function getSessionById(db, sessionInstanceId) {
  return db.sessionInstances.find((session) => session.id === sessionInstanceId) ?? null;
}

function rangesOverlap(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA;
}

function getEffectiveTeacherIdForSession(session, requirement) {
  if (!session || !requirement) {
    return null;
  }

  if (session.teacherId) {
    return session.teacherId;
  }

  if (requirement.possibleTeacherIds?.length === 1) {
    return requirement.possibleTeacherIds[0];
  }

  return null;
}

function getTeacherScheduleConflict({
  db,
  teacherId,
  dayId,
  startSlotId,
  durationSlots,
  ignoredSessionInstanceId = null,
}) {
  if (!teacherId) {
    return null;
  }

  const slotIndexMap = getSlotIndexMap(db);
  const startIndex = slotIndexMap[startSlotId];

  if (startIndex == null) {
    return null;
  }

  return (
    db.sessionInstances.find((session) => {
      if (!session.scheduledDayId || !session.startSlotId) return false;
      if (session.scheduledDayId !== dayId) return false;
      if (ignoredSessionInstanceId && session.id === ignoredSessionInstanceId) {
        return false;
      }

      const sessionStartIndex = slotIndexMap[session.startSlotId];
      const requirement = getRequirementForSession(db, session);

      if (sessionStartIndex == null || !requirement) {
        return false;
      }

      if (getEffectiveTeacherIdForSession(session, requirement) !== teacherId) {
        return false;
      }

      return rangesOverlap(
        startIndex,
        durationSlots,
        sessionStartIndex,
        requirement.durationSlots
      );
    }) ?? null
  );
}

function getUnavailableTeacherLabel(availabilityIssue) {
  if (availabilityIssue?.reason === "teacher-schedule-conflict") {
    return "Deja occupe sur ce creneau";
  }

  if (availabilityIssue?.reason === "teacher-declared-unavailable") {
    return "Indisponible sur ce creneau";
  }

  return "";
}

export function getTeacherById(teachers, teacherId) {
  return teachers.find((teacher) => teacher.id === teacherId) ?? null;
}

export function getTeacherMap(teachers) {
  return byId(teachers);
}

export function getCourseTeachers(courseType, teachers) {
  if (!courseType?.teacherIds?.length) {
    return [];
  }

  const teacherMap = getTeacherMap(teachers);
  return courseType.teacherIds
    .map((teacherId) => teacherMap[teacherId])
    .filter(Boolean);
}

export function getBlockAssignedTeacher(block, teachers) {
  return block?.assignedTeacherId ? getTeacherById(teachers, block.assignedTeacherId) : null;
}

export function getConstraintsForEntity(db, entityType, entityId) {
  return getEntityUnavailabilities(db, entityType, entityId);
}

export function getGlobalConstraints(db) {
  return getGlobalUnavailabilities(db);
}

export function isPromotionUnavailable({
  db,
  promotionId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!promotionId) {
    return false;
  }

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

  return promotionConstraints.some((unavailability) =>
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

export function getPromotionAvailabilityIssue({
  db,
  courseType,
  dayId,
  startSlotId,
  durationSlots,
}) {
  const promotionIds = courseType?.promotionIds ?? [];
  const blockedPromotionId = promotionIds.find((promotionId) =>
    isPromotionUnavailable({
      db,
      promotionId,
      dayId,
      startSlotId,
      durationSlots,
    })
  );

  return blockedPromotionId
    ? {
        promotionId: blockedPromotionId,
        reason: "promotion-unavailable",
      }
    : null;
}

export function isTeacherUnavailable({
  db,
  teacherId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!teacherId) {
    return false;
  }

  return isEntityUnavailable({
    db,
    entityType: "teacher",
    entityId: teacherId,
    dayId,
    startSlotId,
    durationSlots,
  });
}

export function isTeacherAvailable(args) {
  return !isTeacherUnavailable(args);
}

export function getEffectiveTeacherIdForBlockOrCourse(
  block,
  courseType,
  preselectedTeacherId = null
) {
  if (preselectedTeacherId) {
    return preselectedTeacherId;
  }

  if (block?.assignedTeacherId) {
    return block.assignedTeacherId;
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
  const effectiveTeacherId = getEffectiveTeacherIdForBlockOrCourse(
    block,
    courseType,
    preselectedTeacherId
  );

  if (!effectiveTeacherId) {
    return null;
  }

  const declaredUnavailable = isTeacherUnavailable({
    db,
    teacherId: effectiveTeacherId,
    dayId,
    startSlotId,
    durationSlots,
  });

  if (declaredUnavailable) {
    return {
      teacherId: effectiveTeacherId,
      reason: "teacher-declared-unavailable",
    };
  }

  const scheduleConflict = getTeacherScheduleConflict({
    db,
    teacherId: effectiveTeacherId,
    dayId,
    startSlotId,
    durationSlots,
    ignoredSessionInstanceId: block?.sessionInstanceId ?? null,
  });

  if (!scheduleConflict) {
    return null;
  }

  return {
    teacherId: effectiveTeacherId,
    reason: "teacher-schedule-conflict",
  };
}

export function getTeacherAssignmentIssue({ db, sessionInstanceId, teacherId }) {
  if (!teacherId) {
    return null;
  }

  const session = getSessionById(db, sessionInstanceId);
  const requirement = session ? getRequirementForSession(db, session) : null;

  if (!session || !requirement || !session.scheduledDayId || !session.startSlotId) {
    return null;
  }

  const declaredUnavailable = isTeacherUnavailable({
    db,
    teacherId,
    dayId: session.scheduledDayId,
    startSlotId: session.startSlotId,
    durationSlots: requirement.durationSlots,
  });

  if (declaredUnavailable) {
    return {
      teacherId,
      reason: "teacher-declared-unavailable",
    };
  }

  const scheduleConflict = getTeacherScheduleConflict({
    db,
    teacherId,
    dayId: session.scheduledDayId,
    startSlotId: session.startSlotId,
    durationSlots: requirement.durationSlots,
    ignoredSessionInstanceId: session.id,
  });

  return scheduleConflict
    ? {
        teacherId,
        reason: "teacher-schedule-conflict",
        conflictingSessionInstanceId: scheduleConflict.id,
      }
    : null;
}

export function getTeacherOptionsForBlock({
  db,
  courseType,
  block = null,
  dayId,
  startSlotId,
  durationSlots,
}) {
  const linkedTeachers = getCourseTeachers(courseType, db.teachers);

  return linkedTeachers.map((teacher) => {
    const availabilityIssue = getTeacherAvailabilityIssue({
      db,
      courseType: { teacherIds: [teacher.id] },
      block,
      dayId,
      startSlotId,
      durationSlots,
      preselectedTeacherId: teacher.id,
    });

    return {
      teacher,
      available: !availabilityIssue,
      unavailableLabel: getUnavailableTeacherLabel(availabilityIssue),
    };
  });
}

export { isDayClosed };
