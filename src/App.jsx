import { useMemo, useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import Sidebar from "./components/Sidebar";
import WeekTabs from "./components/WeekTabs";
import ScheduleGrid from "./components/ScheduleGrid";
import { DAYS, demoSemester, demoCourseTypes } from "./data/demoData";
import { makeEmptyWeek, placeCourse, removeCourse, durationLabel } from "./utils/schedule";

function buildDemoAssignments() {
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

function DragPreview({ courseType }) {
  if (!courseType) return null;

  return (
    <div className="tile tile-overlay">
      <div className="tile-head">
        <div>
          <div className="tile-title">{courseType.label}</div>
          <div className="tile-subtitle">{courseType.subject}</div>
        </div>
        <span
          className="color-dot"
          style={{ backgroundColor: courseType.color }}
        />
      </div>

      <div className="tile-meta">
        <span>{durationLabel(courseType.durationSlots)}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [semester] = useState(demoSemester);
  const [courseTypes] = useState(demoCourseTypes);
  const [activeWeekId, setActiveWeekId] = useState(demoSemester.weeks[0].id);
  const [assignments, setAssignments] = useState(buildDemoAssignments);
  const [selectedCourseTypeId, setSelectedCourseTypeId] = useState(null);
  const [activeDragTypeId, setActiveDragTypeId] = useState(null);
  const [message, setMessage] = useState(
    "V3 : glisse une tuile de gauche vers une case de la grille, ou clique pour placer."
  );

  const activeWeek = useMemo(
    () => semester.weeks.find((w) => w.id === activeWeekId),
    [semester.weeks, activeWeekId]
  );

  const activeDraggedCourse = courseTypes.find(
    (course) => course.id === activeDragTypeId
  );

  function tryPlaceCourse(courseTypeId, dayIndex, slotIndex) {
    const courseType = courseTypes.find((course) => course.id === courseTypeId);

    if (!courseType) {
      setMessage("Créneau introuvable.");
      return;
    }

    const result = placeCourse({
      assignments,
      weekId: activeWeekId,
      dayIndex,
      slotIndex,
      courseType,
      slotCount: semester.slots.length,
      dayCount: DAYS.length,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setAssignments(result.assignments);
    setMessage(
      `${courseType.label} placé sur ${DAYS[dayIndex]} à ${semester.slots[slotIndex].start}.`
    );
    setSelectedCourseTypeId(null);
  }

  function handleCellClick(dayIndex, slotIndex) {
    if (!selectedCourseTypeId) {
      setMessage("Sélectionne d'abord une tuile dans la colonne de gauche, ou fais un glisser-déposer.");
      return;
    }

    tryPlaceCourse(selectedCourseTypeId, dayIndex, slotIndex);
  }

  function handleBlockClick({ dayIndex, startSlot, typeId }) {
    const courseType = courseTypes.find((course) => course.id === typeId);

    if (!courseType) {
      setMessage("Impossible de supprimer ce créneau.");
      return;
    }

    const result = removeCourse({
      assignments,
      weekId: activeWeekId,
      dayIndex,
      startSlot,
      courseType,
      dayCount: DAYS.length,
      slotCount: semester.slots.length,
    });

    setAssignments(result.assignments);
    setMessage(
      `${courseType.label} supprimé de ${DAYS[dayIndex]} à ${semester.slots[startSlot].start}.`
    );
  }

  function handleDragStart(event) {
    const source = event.active.data.current?.source;
    const typeId = event.active.data.current?.typeId;

    if (source === "palette" && typeId) {
      setActiveDragTypeId(typeId);
    }
  }

  function handleDragEnd(event) {
    const active = event.active;
    const over = event.over;

    const source = active.data.current?.source;
    const typeId = active.data.current?.typeId;

    setActiveDragTypeId(null);

    if (!over || source !== "palette" || !typeId) {
      return;
    }

    const dayIndex = over.data.current?.dayIndex;
    const slotIndex = over.data.current?.slotIndex;

    if (typeof dayIndex !== "number" || typeof slotIndex !== "number") {
      return;
    }

    tryPlaceCourse(typeId, dayIndex, slotIndex);
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Planificateur EDT semestre</h1>
            <p>V3 : glisser-déposer depuis la palette vers la grille.</p>
          </div>
        </header>

        <main className="layout">
          <Sidebar
            semesterName={semester.name}
            courseTypes={courseTypes}
            assignments={assignments}
            selectedCourseTypeId={selectedCourseTypeId}
            onSelectCourseType={setSelectedCourseTypeId}
          />

          <section className="main-column">
            <div className="panel">
              <div className="panel-header">
                <h2>{activeWeek.label}</h2>
                <div className="muted">
                  {activeWeek.start} → {activeWeek.end}
                </div>
                <WeekTabs
                  weeks={semester.weeks}
                  activeWeekId={activeWeekId}
                  onChange={setActiveWeekId}
                />
              </div>
            </div>

            <ScheduleGrid
              days={DAYS}
              slots={semester.slots}
              assignments={assignments}
              activeWeekId={activeWeekId}
              courseTypes={courseTypes}
              selectedCourseTypeId={selectedCourseTypeId}
              onCellClick={handleCellClick}
              onBlockClick={handleBlockClick}
            />

            <div className="panel">
              <div className="panel-header">
                <h2>État</h2>
              </div>
              <div className="panel-body muted">{message}</div>
            </div>
          </section>
        </main>
      </div>

      <DragOverlay>
        <DragPreview courseType={activeDraggedCourse} />
      </DragOverlay>
    </DndContext>
  );
}