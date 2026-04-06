import { getDaysForWeek, getSlots } from "./dbSelectors";

function cloneDb(db) {
  return structuredClone(db);
}

function getRequirement(db, requirementId) {
  return db.requirements.find((item) => item.id === requirementId) ?? null;
}

function getFirstUnplacedSession(db, requirementId) {
  return (
    db.sessionInstances.find(
      (session) =>
        session.requirementId === requirementId &&
        !session.scheduledDayId &&
        !session.startSlotId
    ) ?? null
  );
}

export function placeRequirementInstance({
  db,
  weekId,
  dayIndex,
  slotIndex,
  requirementId,
  teacherId = null,
}) {
  const next = cloneDb(db);
  const requirement = getRequirement(next, requirementId);
  const days = getDaysForWeek(next, weekId);
  const slots = getSlots(next);
  const day = days[dayIndex];
  const slot = slots[slotIndex];
  const session = getFirstUnplacedSession(next, requirementId);

  if (!requirement || !day || !slot || !session) {
    return { ok: false, reason: "Impossible de placer cette occurrence." };
  }

  session.scheduledDayId = day.id;
  session.startSlotId = slot.id;
  session.teacherId = teacherId;
  session.status = "placed";

  return { ok: true, db: next };
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
  const session = next.sessionInstances.find((item) => item.id === sessionInstanceId);

  if (!session || !day || !slot) {
    return { ok: false, reason: "Déplacement impossible." };
  }

  session.scheduledDayId = day.id;
  session.startSlotId = slot.id;
  session.status = "placed";

  return { ok: true, db: next };
}

export function unplaceSessionInstance({ db, sessionInstanceId }) {
  const next = cloneDb(db);
  const session = next.sessionInstances.find((item) => item.id === sessionInstanceId);

  if (!session) {
    return { ok: false, reason: "Suppression impossible." };
  }

  session.scheduledDayId = null;
  session.startSlotId = null;
  session.status = "draft";

  return { ok: true, db: next };
}

export function assignTeacherToSession({
  db,
  sessionInstanceId,
  teacherId,
}) {
  const next = cloneDb(db);
  const session = next.sessionInstances.find((item) => item.id === sessionInstanceId);

  if (!session) {
    return { ok: false, reason: "Affectation impossible." };
  }

  session.teacherId = teacherId;
  return { ok: true, db: next };
}