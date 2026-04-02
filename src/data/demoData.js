export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

export const demoSemester = {
  name: "Semestre démo",
  weeks: [
    { id: "S36", label: "Semaine 36", start: "2026-09-07", end: "2026-09-11" },
    { id: "S37", label: "Semaine 37", start: "2026-09-14", end: "2026-09-18" },
    { id: "S38", label: "Semaine 38", start: "2026-09-21", end: "2026-09-25" },
  ],
  slots: [
    { id: "c1", label: "08:00 – 09:30", start: "08:00", end: "09:30" },
    { id: "c2", label: "09:45 – 11:15", start: "09:45", end: "11:15" },
    { id: "c3", label: "11:30 – 13:00", start: "11:30", end: "13:00" },
    { id: "c4", label: "13:15 – 14:45", start: "13:15", end: "14:45" },
    { id: "c5", label: "15:00 – 16:30", start: "15:00", end: "16:30" },
    { id: "c6", label: "16:45 – 18:15", start: "16:45", end: "18:15" },
  ],
};

export const demoCourseTypes = [
  {
    id: "algo-cm",
    subject: "Algorithmique",
    category: "CM",
    label: "Algo · CM",
    durationSlots: 2,
    totalCount: 2,
    color: "#2563eb",
    teacherIds: ["t-durand", "t-martin"],
  },
  {
    id: "algo-td",
    subject: "Algorithmique",
    category: "TD",
    label: "Algo · TD",
    durationSlots: 1,
    totalCount: 4,
    color: "#0f766e",
    teacherIds: ["t-martin"],
  },
  {
    id: "bdd-cm",
    subject: "Bases de données",
    category: "CM",
    label: "BDD · CM",
    durationSlots: 1,
    totalCount: 3,
    color: "#9333ea",
    teacherIds: ["t-bernard"],
  },
];