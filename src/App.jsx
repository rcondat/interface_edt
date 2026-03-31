import { useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import WeekTabs from "./components/WeekTabs";
import ScheduleGrid from "./components/ScheduleGrid";
import { DAYS, demoSemester, demoCourseTypes } from "./data/demoData";
import { makeEmptyWeek } from "./utils/schedule";

export default function App() {
  const [semester] = useState(demoSemester);
  const [courseTypes] = useState(demoCourseTypes);
  const [activeWeekId, setActiveWeekId] = useState(demoSemester.weeks[0].id);
  const [message] = useState("Base initiale prête.");

  const assignments = useMemo(
    () => ({
      [semester.weeks[0].id]: makeEmptyWeek(DAYS.length, semester.slots.length),
    }),
    [semester]
  );

  const activeWeek = semester.weeks.find((w) => w.id === activeWeekId);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Planificateur EDT semestre</h1>
          <p>Base propre React + Vite, pensée pour évoluer et être déployée facilement.</p>
        </div>
      </header>

      <main className="layout">
        <Sidebar
          semesterName={semester.name}
          courseTypes={courseTypes}
          assignments={assignments}
        />

        <section className="main-column">
          <div className="panel">
            <div className="panel-header">
              <h2>{activeWeek.label}</h2>
              <div className="muted">{activeWeek.start} → {activeWeek.end}</div>
              <WeekTabs
                weeks={semester.weeks}
                activeWeekId={activeWeekId}
                onChange={setActiveWeekId}
              />
            </div>
          </div>

          <ScheduleGrid days={DAYS} slots={semester.slots} />

          <div className="panel">
            <div className="panel-header">
              <h2>État</h2>
            </div>
            <div className="panel-body muted">{message}</div>
          </div>
        </section>
      </main>
    </div>
  );
}