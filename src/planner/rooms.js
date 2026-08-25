import { getAudienceStudentCount, getRequirementForSession } from "./audience";
import {
  getSlotIndexMap,
  isDayClosed,
  isEntityUnavailable,
} from "./unavailability";

function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

function rangesOverlap(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA;
}

function getRoomScheduleConflict({
  db,
  roomId,
  dayId,
  startSlotId,
  durationSlots,
  ignoredSessionInstanceId = null,
}) {
  if (!roomId) {
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
      if (session.roomId !== roomId) return false;
      if (ignoredSessionInstanceId && session.id === ignoredSessionInstanceId) {
        return false;
      }

      const requirement = getRequirementForSession(db, session);
      const sessionStartIndex = slotIndexMap[session.startSlotId];

      if (!requirement || sessionStartIndex == null) {
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

function getUnavailableRoomLabel(availabilityIssue) {
  switch (availabilityIssue?.reason) {
    case "room-capacity-exceeded":
      return "Capacite insuffisante";
    case "room-category-mismatch":
      return "Categorie non autorisee";
    case "room-declared-unavailable":
      return "Indisponible sur ce creneau";
    case "room-schedule-conflict":
      return "Salle deja occupee sur ce creneau";
    default:
      return "";
  }
}

export function getRoomById(rooms, roomId) {
  return rooms.find((room) => room.id === roomId) ?? null;
}

export function getRoomMap(rooms) {
  return byId(rooms);
}

export function getRoomCategoriesMap(roomCategories) {
  return byId(roomCategories);
}

export function getBlockAssignedRoom(block, rooms) {
  return block?.assignedRoomId ? getRoomById(rooms, block.assignedRoomId) : null;
}

export function isRoomAllowedForCourseType(room, courseType) {
  if (!room || !courseType) {
    return false;
  }

  const allowedRoomCategoryIds = courseType.allowedRoomCategoryIds ?? [];

  if (!allowedRoomCategoryIds.length) {
    return true;
  }

  return (room.roomCategoryIds ?? []).some((roomCategoryId) =>
    allowedRoomCategoryIds.includes(roomCategoryId)
  );
}

export function isRoomCapacitySufficient(room, courseType) {
  if (!room) {
    return false;
  }

  if (!courseType?.studentCount) {
    return true;
  }

  return room.capacity >= courseType.studentCount;
}

export function isRoomUnavailable({
  db,
  roomId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  return isEntityUnavailable({
    db,
    entityType: "room",
    entityId: roomId,
    dayId,
    startSlotId,
    durationSlots,
  });
}

export function getRoomAvailabilityIssue({
  db,
  courseType,
  block,
  roomId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!roomId) {
    return null;
  }

  const room = getRoomById(db.rooms ?? [], roomId);

  if (!room) {
    return {
      roomId,
      reason: "room-not-found",
    };
  }

  if (!isRoomAllowedForCourseType(room, courseType)) {
    return {
      roomId,
      reason: "room-category-mismatch",
    };
  }

  if (!isRoomCapacitySufficient(room, courseType)) {
    return {
      roomId,
      reason: "room-capacity-exceeded",
    };
  }

  if (isDayClosed(db, dayId)) {
    return {
      roomId,
      reason: "day-closed",
    };
  }

  if (
    isRoomUnavailable({
      db,
      roomId,
      dayId,
      startSlotId,
      durationSlots,
    })
  ) {
    return {
      roomId,
      reason: "room-declared-unavailable",
    };
  }

  const scheduleConflict = getRoomScheduleConflict({
    db,
    roomId,
    dayId,
    startSlotId,
    durationSlots,
    ignoredSessionInstanceId: block?.sessionInstanceId ?? null,
  });

  if (!scheduleConflict) {
    return null;
  }

  return {
    roomId,
    reason: "room-schedule-conflict",
    conflictingSessionInstanceId: scheduleConflict.id,
  };
}

export function getRoomAssignmentIssue({ db, sessionInstanceId, roomId }) {
  if (!roomId) {
    return null;
  }

  const session = db.sessionInstances.find((item) => item.id === sessionInstanceId) ?? null;
  const requirement = session ? getRequirementForSession(db, session) : null;

  if (!session || !requirement || !session.scheduledDayId || !session.startSlotId) {
    return null;
  }

  const audience = session?.targetGroupIds?.length
    ? { targetGroupIds: session.targetGroupIds }
    : null;
  const studentCount = audience ? getAudienceStudentCount(db, audience) : null;

  return getRoomAvailabilityIssue({
    db,
    courseType: {
      allowedRoomCategoryIds: requirement.allowedRoomCategoryIds ?? [],
      studentCount,
    },
    block: { sessionInstanceId: session.id },
    roomId,
    dayId: session.scheduledDayId,
    startSlotId: session.startSlotId,
    durationSlots: requirement.durationSlots,
  });
}

export function getRoomOptionsForBlock({
  db,
  courseType,
  block = null,
  dayId,
  startSlotId,
  durationSlots,
}) {
  return (db.rooms ?? []).map((room) => {
    const availabilityIssue = getRoomAvailabilityIssue({
      db,
      courseType,
      block,
      roomId: room.id,
      dayId,
      startSlotId,
      durationSlots,
    });

    return {
      room,
      available: !availabilityIssue,
      unavailableLabel: getUnavailableRoomLabel(availabilityIssue),
    };
  });
}
