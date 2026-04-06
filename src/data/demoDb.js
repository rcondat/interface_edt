function makeSlot(id, index, startTime, endTime) {
  return {
    id,
    index,
    startTime,
    endTime,
    durationMinutes: 90,
    label: `${startTime} – ${endTime}`,
  };
}

function makeDay(id, weekId, date, weekdayIndex, weekdayLabel, options = {}) {
  return {
    id,
    weekId,
    date,
    weekdayIndex,
    weekdayLabel,
    isHoliday: false,
    isClosed: false,
    ...options,
  };
}

export function buildDemoDb() {
  const slots = [
    makeSlot("slot-1", 0, "08:00", "09:30"),
    makeSlot("slot-2", 1, "09:45", "11:15"),
    makeSlot("slot-3", 2, "11:30", "13:00"),
    makeSlot("slot-4", 3, "13:15", "14:45"),
    makeSlot("slot-5", 4, "15:00", "16:30"),
    makeSlot("slot-6", 5, "16:45", "18:15"),
  ];

  const semester = {
    id: "sem-1",
    label: "Semestre démo",
    weekIds: ["week-36", "week-37", "week-38"],
    promotionIds: ["promo-iti3"],
    slotIds: slots.map((slot) => slot.id),
  };

  const weeks = [
    {
      id: "week-36",
      semesterId: "sem-1",
      label: "Semaine 36",
      startDate: "2026-09-07",
      endDate: "2026-09-11",
      dayIds: ["day-36-1", "day-36-2", "day-36-3", "day-36-4", "day-36-5"],
    },
    {
      id: "week-37",
      semesterId: "sem-1",
      label: "Semaine 37",
      startDate: "2026-09-14",
      endDate: "2026-09-18",
      dayIds: ["day-37-1", "day-37-2", "day-37-3", "day-37-4", "day-37-5"],
    },
    {
      id: "week-38",
      semesterId: "sem-1",
      label: "Semaine 38",
      startDate: "2026-09-21",
      endDate: "2026-09-25",
      dayIds: ["day-38-1", "day-38-2", "day-38-3", "day-38-4", "day-38-5"],
    },
  ];

  const days = [
    makeDay("day-36-1", "week-36", "2026-09-07", 0, "Lundi"),
    makeDay("day-36-2", "week-36", "2026-09-08", 1, "Mardi"),
    makeDay("day-36-3", "week-36", "2026-09-09", 2, "Mercredi"),
    makeDay("day-36-4", "week-36", "2026-09-10", 3, "Jeudi"),
    makeDay("day-36-5", "week-36", "2026-09-11", 4, "Vendredi"),

    makeDay("day-37-1", "week-37", "2026-09-14", 0, "Lundi"),
    makeDay("day-37-2", "week-37", "2026-09-15", 1, "Mardi"),
    makeDay("day-37-3", "week-37", "2026-09-16", 2, "Mercredi"),
    makeDay("day-37-4", "week-37", "2026-09-17", 3, "Jeudi"),
    makeDay("day-37-5", "week-37", "2026-09-18", 4, "Vendredi"),

    makeDay("day-38-1", "week-38", "2026-09-21", 0, "Lundi"),
    makeDay("day-38-2", "week-38", "2026-09-22", 1, "Mardi"),
    makeDay("day-38-3", "week-38", "2026-09-23", 2, "Mercredi", {
      isHoliday: true,
      isClosed: true,
    }),
    makeDay("day-38-4", "week-38", "2026-09-24", 3, "Jeudi"),
    makeDay("day-38-5", "week-38", "2026-09-25", 4, "Vendredi"),
  ];

  const teachers = [
    { id: "t-durand", firstName: "Jean", lastName: "Durand" },
    { id: "t-martin", firstName: "Claire", lastName: "Martin" },
    { id: "t-bernard", firstName: "Luc", lastName: "Bernard" },
  ];

  const promotions = [
    {
      id: "promo-iti3",
      semesterId: "sem-1",
      label: "ITI 3",
      groupIds: ["grp-td1", "grp-td2"],
      ecIds: ["ec-algo", "ec-bdd"],
    },
  ];

  const groups = [
    { id: "grp-td1", promotionId: "promo-iti3", label: "TD1" },
    { id: "grp-td2", promotionId: "promo-iti3", label: "TD2" },
  ];

  const ecs = [
    {
      id: "ec-algo",
      promotionId: "promo-iti3",
      code: "ALGO",
      label: "Algorithmique",
      color: "#2563eb",
      requirementIds: ["req-algo-cm", "req-algo-td"],
    },
    {
      id: "ec-bdd",
      promotionId: "promo-iti3",
      code: "BDD",
      label: "Bases de données",
      color: "#9333ea",
      requirementIds: ["req-bdd-cm"],
    },
  ];

  const requirements = [
    {
      id: "req-algo-cm",
      ecId: "ec-algo",
      type: "CM",
      durationSlots: 2,
      occurrencesRequired: 2,
      possibleTeacherIds: ["t-durand", "t-martin"],
      targetPromotionIds: ["promo-iti3"],
      targetGroupIds: [],
    },
    {
      id: "req-algo-td",
      ecId: "ec-algo",
      type: "TD",
      durationSlots: 1,
      occurrencesRequired: 4,
      possibleTeacherIds: ["t-martin"],
      targetPromotionIds: [],
      targetGroupIds: ["grp-td1", "grp-td2"],
    },
    {
      id: "req-bdd-cm",
      ecId: "ec-bdd",
      type: "CM",
      durationSlots: 1,
      occurrencesRequired: 3,
      possibleTeacherIds: ["t-bernard"],
      targetPromotionIds: ["promo-iti3"],
      targetGroupIds: [],
    },
  ];

  const sessionInstances = [
    {
      id: "sess-algo-cm-1",
      requirementId: "req-algo-cm",
      occurrenceIndex: 1,
      teacherId: "t-durand",
      scheduledDayId: "day-36-1",
      startSlotId: "slot-1",
      status: "placed",
    },
    {
      id: "sess-algo-cm-2",
      requirementId: "req-algo-cm",
      occurrenceIndex: 2,
      teacherId: null,
      scheduledDayId: null,
      startSlotId: null,
      status: "draft",
    },
    {
      id: "sess-algo-td-1",
      requirementId: "req-algo-td",
      occurrenceIndex: 1,
      teacherId: "t-martin",
      scheduledDayId: "day-36-5",
      startSlotId: "slot-4",
      status: "placed",
    },
    {
      id: "sess-algo-td-2",
      requirementId: "req-algo-td",
      occurrenceIndex: 2,
      teacherId: null,
      scheduledDayId: null,
      startSlotId: null,
      status: "draft",
    },
    {
      id: "sess-algo-td-3",
      requirementId: "req-algo-td",
      occurrenceIndex: 3,
      teacherId: null,
      scheduledDayId: null,
      startSlotId: null,
      status: "draft",
    },
    {
      id: "sess-algo-td-4",
      requirementId: "req-algo-td",
      occurrenceIndex: 4,
      teacherId: null,
      scheduledDayId: null,
      startSlotId: null,
      status: "draft",
    },
    {
      id: "sess-bdd-cm-1",
      requirementId: "req-bdd-cm",
      occurrenceIndex: 1,
      teacherId: "t-bernard",
      scheduledDayId: "day-36-3",
      startSlotId: "slot-2",
      status: "placed",
    },
    {
      id: "sess-bdd-cm-2",
      requirementId: "req-bdd-cm",
      occurrenceIndex: 2,
      teacherId: null,
      scheduledDayId: null,
      startSlotId: null,
      status: "draft",
    },
    {
      id: "sess-bdd-cm-3",
      requirementId: "req-bdd-cm",
      occurrenceIndex: 3,
      teacherId: null,
      scheduledDayId: null,
      startSlotId: null,
      status: "draft",
    },
  ];

  const constraints = [
    {
      id: "constraint-durand-weekly",
      entityType: "teacher",
      entityId: "t-durand",
      timeScopeType: "weekly",
      dayIndex: 1,
      startSlotId: "slot-4",
      endSlotId: "slot-5",
      weekIds: [],
      startDate: null,
      endDate: null,
      date: null,
      dayId: null,
      slotId: null,
    },
    {
      id: "constraint-martin-specific-weeks",
      entityType: "teacher",
      entityId: "t-martin",
      timeScopeType: "specific-weeks",
      dayIndex: 4,
      startSlotId: "slot-1",
      endSlotId: "slot-3",
      weekIds: ["week-36", "week-38"],
      startDate: null,
      endDate: null,
      date: null,
      dayId: null,
      slotId: null,
    },
    {
      id: "constraint-bernard-date-time",
      entityType: "teacher",
      entityId: "t-bernard",
      timeScopeType: "specific-date-time",
      dayIndex: null,
      startSlotId: "slot-4",
      endSlotId: "slot-5",
      weekIds: [],
      startDate: null,
      endDate: null,
      date: "2026-09-22",
      dayId: null,
      slotId: null,
    },
    {
      id: "constraint-global-holiday-day-38-3",
      entityType: "global",
      entityId: null,
      timeScopeType: "day",
      dayIndex: null,
      startSlotId: null,
      endSlotId: null,
      weekIds: [],
      startDate: null,
      endDate: null,
      date: null,
      dayId: "day-38-3",
      slotId: null,
    },
  ];

  return {
    semesters: [semester],
    weeks,
    days,
    slots,
    promotions,
    groups,
    ecs,
    requirements,
    sessionInstances,
    teachers,
    constraints,
  };
}