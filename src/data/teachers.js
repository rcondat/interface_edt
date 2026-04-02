export const demoTeachers = [
  {
    id: "t-durand",
    name: "Jean Durand",
    shortName: "J. Durand",
    unavailabilities: [
      {
        id: "u-durand-1",
        type: "weekly",
        dayIndex: 1,
        startSlot: 3,
        endSlot: 4,
      },
      {
        id: "u-durand-2",
        type: "date-range",
        startDate: "2026-09-22",
        endDate: "2026-09-29",
        startSlot: 0,
        endSlot: 6,
      },
    ],
  },
  {
    id: "t-martin",
    name: "Claire Martin",
    shortName: "C. Martin",
    unavailabilities: [
      {
        id: "u-martin-1",
        type: "specific-weeks",
        weekIds: ["S36", "S38"],
        dayIndex: 4,
        startSlot: 0,
        endSlot: 2,
      },
    ],
  },
  {
    id: "t-bernard",
    name: "Luc Bernard",
    shortName: "L. Bernard",
    unavailabilities: [
      {
        id: "u-bernard-1",
        type: "specific-date-time",
        date: "2026-09-22",
        startSlot: 3,
        endSlot: 4,
      },
    ],
  },
];