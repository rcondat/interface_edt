import {
  buildTeacherDisplayName,
  buildTeacherShortName,
  sortTeachersByLastName,
} from "../planner/teacherManagement";

export default function TeacherPanel({
  teachers,
  selectedTeacherId,
  onSelectTeacher,
  onRequestDeleteTeacher,
}) {
  const sortedTeachers = sortTeachersByLastName(teachers);

  return (
    <section className="panel teacher-panel">
      <div className="panel-header">
        <h2>Intervenants</h2>
      </div>

      <div className="panel-body">
        {sortedTeachers.length === 0 ? (
          <div className="empty-box">Aucun intervenant enregistré.</div>
        ) : (
          <div className="teacher-scroll-list">
            {sortedTeachers.map((teacher) => {
              const isSelected = selectedTeacherId === teacher.id;

              return (
                <button
                  key={teacher.id}
                  type="button"
                  className={
                    isSelected
                      ? "teacher-row teacher-row-selected"
                      : "teacher-row"
                  }
                  onClick={() =>
                    onSelectTeacher(isSelected ? null : teacher.id)
                  }
                >
                  <div className="teacher-row-main">
                    <div className="teacher-row-name">
                      {buildTeacherDisplayName(teacher)}
                    </div>
                    <div className="teacher-row-short">{buildTeacherShortName(teacher)}</div>
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}