import {
  getBlockAssignedTeacher,
  getCourseTeachers,
  getTeacherOptionsForBlock,
} from "../planner/teachers";
import { buildTeacherShortName } from "../planner/teacherManagement";
import { getSlotsView, getWeekDays } from "../planner/dbSelectors";

export default function CourseDetailsPanel({
  db,
  selectedBlock,
  selectedPaletteCourseId,
  courseTypes,
  teachers,
  assignments,
  activeWeek,
  onAssignTeacher,
}) {
  const selectedCourseTypeId =
    selectedBlock?.typeId ?? selectedPaletteCourseId ?? null;

  const courseType = selectedCourseTypeId
    ? courseTypes.find((course) => course.id === selectedCourseTypeId)
    : null;

  const block =
    selectedBlock?.weekId === activeWeek.id
      ? assignments[activeWeek.id]?.[selectedBlock.dayIndex]?.[selectedBlock.startSlot] ?? null
      : null;

  if (!courseType) {
    return null;
  }

  const linkedTeachers = getCourseTeachers(courseType, teachers);
  const hasSingleTeacher = linkedTeachers.length === 1;

  const assignedTeacher = block
    ? getBlockAssignedTeacher(block, teachers)
    : null;

  const weekDays = getWeekDays(db, activeWeek.id);
  const slots = getSlotsView(db);

  const selectedDay = block ? weekDays[selectedBlock.dayIndex] : null;
  const selectedSlot = block ? slots[selectedBlock.startSlot] : null;

  const teacherOptions =
    block && selectedDay && selectedSlot
      ? getTeacherOptionsForBlock({
          db,
          courseType,
          dayId: selectedDay.id,
          startSlotId: selectedSlot.id,
          durationSlots: block.durationSlots,
        })
      : [];

  const gridTeacherValue = assignedTeacher?.id ?? "";

  return (
    <aside className="panel details-panel">
      <div className="panel-body details-panel-body">
        <div className="panel-section-title">Modification du cours</div>

        <div className="details-stack">
          <section className="details-section">
            <div className="details-label">Cours</div>
            <div className="details-title">{courseType.label}</div>
            <div className="details-subtitle">
              {courseType.subject} · {courseType.category}
            </div>
          </section>
        </div>

        {block && (
          <>
            <div className="details-divider" />

            <div className="panel-section-title">Modification du créneau</div>

            <div className="details-stack">
              <section className="details-section">
                <div className="details-subtitle">
                  {activeWeek.label} · créneau placé
                </div>
              </section>

              <section className="details-section">
                <div className="details-label">Intervenant affecté</div>

                {teacherOptions.length === 0 ? (
                  <div className="details-value muted">
                    Aucun enseignant renseigné
                  </div>
                ) : (
                  <select
                    className="teacher-select"
                    value={hasSingleTeacher ? linkedTeachers[0].id : gridTeacherValue}
                    onChange={(event) => {
                      const teacherId = event.target.value || null;
                      onAssignTeacher?.({
                        dayIndex: selectedBlock.dayIndex,
                        startSlot: selectedBlock.startSlot,
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
                        {!available ? " - indisponible" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}