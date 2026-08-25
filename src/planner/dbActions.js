import { getDaysForWeek, getSlots } from "./dbSelectors";
import { getRequirementForSession } from "./audience";
import { getRoomAssignmentIssue } from "./rooms";

function cloneDb(db) {
  return structuredClone(db);
}

function getSlotIndexMap(db) {
  return Object.fromEntries(
    [...db.slots]
      .sort((a, b) => a.index - b.index)
      .map((slot, index) => [slot.id, index])
  );
}

function getSessionById(db, sessionInstanceId) {
  return db.sessionInstances.find((item) => item.id === sessionInstanceId) ?? null;
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

function hasTeacherAssignmentConflict({ db, sessionInstanceId, teacherId }) {
  if (!teacherId) {
    return false;
  }

  const session = getSessionById(db, sessionInstanceId);
  const requirement = session ? getRequirementForSession(db, session) : null;

  if (!session || !requirement || !session.scheduledDayId || !session.startSlotId) {
    return false;
  }

  const slotIndexMap = getSlotIndexMap(db);
  const sessionStartIndex = slotIndexMap[session.startSlotId];

  if (sessionStartIndex == null) {
    return false;
  }

  return db.sessionInstances.some((candidate) => {
    if (candidate.id === session.id) return false;
    if (!candidate.scheduledDayId || !candidate.startSlotId) return false;
    if (candidate.scheduledDayId !== session.scheduledDayId) return false;

    const candidateRequirement = getRequirementForSession(db, candidate);
    const candidateStartIndex = slotIndexMap[candidate.startSlotId];

    if (!candidateRequirement || candidateStartIndex == null) {
      return false;
    }

    if (getEffectiveTeacherIdForSession(candidate, candidateRequirement) !== teacherId) {
      return false;
    }

    return rangesOverlap(
      sessionStartIndex,
      requirement.durationSlots,
      candidateStartIndex,
      candidateRequirement.durationSlots
    );
  });
}

export function placeSessionInstance({
  db,
  sessionInstanceId,
  weekId,
  dayIndex,
  slotIndex,
  teacherId = null,
}) {
  const next = cloneDb(db);
  const days = getDaysForWeek(next, weekId);
  const slots = getSlots(next);
  const day = days[dayIndex];
  const slot = slots[slotIndex];
  const session = getSessionById(next, sessionInstanceId);

  if (!session || !day || !slot) {
    return { ok: false, reason: "Impossible de placer cette occurrence." };
  }

  session.scheduledDayId = day.id;
  session.startSlotId = slot.id;
  session.teacherId = teacherId;
  session.status = "placed";

  return { ok: true, db: next, sessionInstanceId: session.id };
}

export function moveSessionInstance({
  db,
  sessionInstanceId,
  weekId,
  dayIndex,
  slotIndex,
}) {
  const next = cloneDb(db);
  const days = getDaysForWeek(next, weekId);
  const slots = getSlots(next);
  const day = days[dayIndex];
  const slot = slots[slotIndex];
  const session = getSessionById(next, sessionInstanceId);

  if (!session || !day || !slot) {
    return { ok: false, reason: "Deplacement impossible." };
  }

  session.scheduledDayId = day.id;
  session.startSlotId = slot.id;
  session.status = "placed";

  return { ok: true, db: next };
}

export function unplaceSessionInstance({ db, sessionInstanceId }) {
  const next = cloneDb(db);
  const session = getSessionById(next, sessionInstanceId);

  if (!session) {
    return { ok: false, reason: "Suppression impossible." };
  }

  session.scheduledDayId = null;
  session.startSlotId = null;
  session.status = "draft";

  return { ok: true, db: next };
}

export function assignTeacherToSession({ db, sessionInstanceId, teacherId }) {
  const next = cloneDb(db);
  const session = getSessionById(next, sessionInstanceId);

  if (!session) {
    return { ok: false, reason: "Affectation impossible." };
  }

  if (teacherId && hasTeacherAssignmentConflict({ db: next, sessionInstanceId, teacherId })) {
    return {
      ok: false,
      reason: "Affectation impossible : intervenant deja occupe sur ce creneau.",
    };
  }

  session.teacherId = teacherId;
  return { ok: true, db: next };
}

export function assignRoomToSession({ db, sessionInstanceId, roomId }) {
  const next = cloneDb(db);
  const session = getSessionById(next, sessionInstanceId);

  if (!session) {
    return { ok: false, reason: "Affectation de salle impossible." };
  }

  if (roomId) {
    const roomIssue = getRoomAssignmentIssue({
      db: next,
      sessionInstanceId,
      roomId,
    });

    if (roomIssue) {
      return {
        ok: false,
        reason: "Affectation de salle impossible.",
        roomIssue,
      };
    }
  }

  session.roomId = roomId;
  return { ok: true, db: next };
}
