import { DAYS, demoSemester } from "./demoData";
import { makeEmptyWeek } from "../planner/model";

export function buildDemoAssignments() {
  const week = makeEmptyWeek(DAYS.length, demoSemester.slots.length);

  week[0][0] = { typeId: "algo-cm", segment: 0, startSlot: 0, durationSlots: 2 };
  week[0][1] = { typeId: "algo-cm", segment: 1, startSlot: 0, durationSlots: 2 };

  week[2][1] = { typeId: "bdd-cm", segment: 0, startSlot: 1, durationSlots: 1 };
  week[4][3] = { typeId: "algo-td", segment: 0, startSlot: 3, durationSlots: 1 };

  return {
    [demoSemester.weeks[0].id]: week,
    [demoSemester.weeks[1].id]: makeEmptyWeek(DAYS.length, demoSemester.slots.length),
    [demoSemester.weeks[2].id]: makeEmptyWeek(DAYS.length, demoSemester.slots.length),
  };
}