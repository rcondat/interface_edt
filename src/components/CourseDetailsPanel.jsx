import {
  getBlockAssignedTeacher,
  getCourseTeachers,
  getTeacherOptionsForBlock,
} from "../planner/teachers";
import {
  buildTeacherDisplayName,
  buildTeacherShortName,
} from "../planner/teacherManagement";

export default function CourseDetailsPanel({
  selectedItem,
  courseTypes,
  teachers,
  assignments,
  activeWeek,
  onAssignTeacher,
  pendingTeacherAssignments,
  onSetPendingTeacher,
}) {
  const courseType = selectedItem
    ? courseTypes.find((course) => course.id === selectedItem.typeId)
    : null;

  let block = null;

  if (
    selectedItem?.source === "grid" &&
    assignments[activeWeek.id]?.[selectedItem.dayIndex]?.[selectedItem.startSlot]
  ) {
    block = assignments[activeWeek.id][selectedItem.dayIndex][selectedItem.startSlot];
  }

  const assignedTeacher = getBlockAssignedTeacher(block, teachers);

  const linkedTeachers = courseType ? getCourseTeachers(courseType, teachers) : [];

  const teacherOptions =
    courseType && block
      ? getTeacherOptionsForBlock({
          teachers,
          courseType,
          week: activeWeek,
          dayIndex: selectedItem.dayIndex,
          startSlot: selectedItem.startSlot,
          durationSlots: block.durationSlots,
        })
      : [];

  const paletteTeacherValue =
    selectedItem?.source === "palette" && courseType
      ? pendingTeacherAssignments?.[courseType.id] ?? ""
      : "";

  const gridTeacherValue = assignedTeacher?.id ?? "";
  const hasSingleTeacher = linkedTeachers.length === 1;
  
  return (
    <aside className="panel details-panel">
      <div className="panel-header">
        <h2>Détails du cours</h2>
      </div>

      <div className="panel-body">
        {!courseType ? (
          <div className="empty-box">
            Sélectionne une tuile dans le menu ou un créneau placé dans la grille.
          </div>
        ) : (
          <div className="details-stack">
            <section className="details-section">
              <div className="details-label">Cours</div>
              <div className="details-title">{courseType.label}</div>
              <div className="details-subtitle">
                {courseType.subject} · {courseType.category}
              </div>
            </section>

            <section className="details-section">
              <div className="details-label">Intervenant affecté</div>

              {selectedItem?.source === "palette" ? (
                linkedTeachers.length === 0 ? (
                  <div className="details-value muted">Aucun enseignant renseigné</div>
                ) : (
                  <select
                    className="teacher-select"
                    value={hasSingleTeacher ? linkedTeachers[0].id : paletteTeacherValue}
                    onChange={(event) => {
                      const teacherId = event.target.value || null;
                      onSetPendingTeacher?.({
                        typeId: courseType.id,
                        teacherId,
                      });
                    }}
                  >
                    {!hasSingleTeacher && <option value="">Aucun</option>}
                    {linkedTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {buildTeacherDisplayName(teacher)} ({buildTeacherShortName(teacher)})
                      </option>
                    ))}
                  </select>
                )
              ) : teacherOptions.length === 0 ? (
                <div className="details-value muted">Aucun enseignant renseigné</div>
              ) : (
                <select
                  className="teacher-select"
                  value={
                    hasSingleTeacher
                      ? linkedTeachers[0].id
                      : gridTeacherValue
                  }
                  onChange={(event) => {
                    const teacherId = event.target.value || null;
                    onAssignTeacher?.({
                      dayIndex: selectedItem.dayIndex,
                      startSlot: selectedItem.startSlot,
                      durationSlots: block.durationSlots,
                      teacherId,
                    });
                  }}
                >
                  {!hasSingleTeacher && <option value="">Aucun</option>}
                  {teacherOptions.map(({ teacher, available }) => (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                      disabled={!available}
                    >
                      {buildTeacherShortName(teacher)}
                      {!available ? " — indisponible" : ""}
                    </option>
                  ))}
                </select>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}