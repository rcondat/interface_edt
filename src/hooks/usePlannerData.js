import { useMemo, useState } from "react";

import { buildDemoDb } from "../data/demoDb";
import {
  buildAssignmentsView,
  getRequirementsView,
  getSemesterView,
  getTeachers,
  getWeek,
  getWeekDaysView,
} from "../planner/dbSelectors";
import { getTeacherMap } from "../planner/teachers";

export default function usePlannerData() {
  const [db, setDb] = useState(buildDemoDb);
  const [activeWeekId, setActiveWeekId] = useState("week-36");

  const semester = useMemo(() => getSemesterView(db, "sem-1"), [db]);
  const courseTypes = useMemo(() => getRequirementsView(db), [db]);
  const teachers = useMemo(() => getTeachers(db), [db]);
  const assignments = useMemo(
    () => buildAssignmentsView(db, activeWeekId),
    [db, activeWeekId]
  );
  const teacherMap = useMemo(() => getTeacherMap(teachers), [teachers]);

  const activeWeek = useMemo(() => {
    const week = getWeek(db, activeWeekId);
    return {
      id: week.id,
      label: week.label,
      start: week.startDate,
      end: week.endDate,
    };
  }, [db, activeWeekId]);

  const weekDayLabels = useMemo(
    () => getWeekDaysView(db, activeWeekId),
    [db, activeWeekId]
  );

  return {
    db,
    setDb,
    activeWeekId,
    setActiveWeekId,
    semester,
    courseTypes,
    teachers,
    assignments,
    teacherMap,
    activeWeek,
    weekDayLabels,
  };
}