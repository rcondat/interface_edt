import { useMemo, useState } from "react";
import {
  buildTeacherDisplayName,
  sortTeachersByLastName,
} from "../planner/teacherManagement";

export default function TeacherPanel({
  teachers,
  selectedTeacherId,
  onSelectTeacher,
  onRequestDeleteTeacher,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const sortedTeachers = useMemo(
    () => sortTeachersByLastName(teachers),
    [teachers]
  );

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredTeachers = useMemo(() => {
    if (!normalizedQuery) return sortedTeachers;

    return sortedTeachers.filter((teacher) => {
      const displayName = buildTeacherDisplayName(teacher).toLowerCase();
      const firstName = (teacher.firstName ?? "").toLowerCase();
      const lastName = (teacher.lastName ?? "").toLowerCase();

      return (
        displayName.includes(normalizedQuery) ||
        firstName.includes(normalizedQuery) ||
        lastName.includes(normalizedQuery)
      );
    });
  }, [sortedTeachers, normalizedQuery]);

  return (
    <section className="panel teacher-panel sidebar-panel">
      <div className="panel-header">
        <h2>Intervenants</h2>
      </div>

      <div className="panel-body teacher-panel-body">
        <div className="sidebar-search">
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Rechercher un intervenant..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="sidebar-teachers-scroll-body scroll-area">
          {filteredTeachers.length === 0 ? (
            <div className="empty-box">
              {normalizedQuery
                ? "Aucun intervenant ne correspond à la recherche."
                : "Aucun intervenant enregistré."}
            </div>
          ) : (
            <div className="teacher-scroll-list">
              {filteredTeachers.map((teacher) => {
                const isSelected = selectedTeacherId === teacher.id;

                return (
                  <div
                    key={teacher.id}
                    className={
                      isSelected
                        ? "teacher-row teacher-row-selected"
                        : "teacher-row"
                    }
                    onClick={() => onSelectTeacher(teacher.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectTeacher(teacher.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="teacher-row-main">
                      <div className="teacher-row-name">
                        {buildTeacherDisplayName(teacher)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="teacher-row-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRequestDeleteTeacher(teacher);
                      }}
                      aria-label={`Supprimer ${buildTeacherDisplayName(teacher)}`}
                      title={`Supprimer ${buildTeacherDisplayName(teacher)}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}