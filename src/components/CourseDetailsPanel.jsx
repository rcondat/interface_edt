import { useState } from "react";
import {
  getBlockAssignedTeacher,
  getCourseTeachers,
  getTeacherOptionsForBlock,
} from "../planner/teachers";
import { buildTeacherShortName } from "../planner/teacherManagement";
import { getSlotsView, getWeekDays } from "../planner/dbSelectors";

function AudienceSummary({ courseType }) {
  return (
    <div className="details-chip-row">
      {courseType.promotionLabel ? (
        <span className="details-chip">{courseType.promotionLabel}</span>
      ) : null}
    </div>
  );
}

export default function CourseDetailsPanel({
  db,
  selectedBlock,
  selectedPaletteCourseId,
  courseTypes,
  paletteItems,
  teachers,
  assignments,
  activeWeek,
  onAssignTeacher,
}) {
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);

  const paletteItem = selectedPaletteCourseId
    ? paletteItems?.find((item) => item.id === selectedPaletteCourseId) ?? null
    : null;

  const selectedCourseTypeId = selectedBlock?.typeId ?? paletteItem?.id ?? null;

  const courseType = selectedCourseTypeId
    ? courseTypes.find((course) => course.id === selectedCourseTypeId)
    : null;

  const block =
    selectedBlock?.weekId === activeWeek.id
      ? (
          assignments[activeWeek.id]?.[selectedBlock.dayIndex]?.[selectedBlock.startSlot] ?? []
        ).find((entry) => entry.sessionInstanceId === selectedBlock.sessionInstanceId) ?? null
      : null;

  if (!courseType) {
    return null;
  }

  const linkedTeachers = getCourseTeachers(courseType, teachers);
  const hasSingleTeacher = linkedTeachers.length === 1;

  const assignedTeacher = block ? getBlockAssignedTeacher(block, teachers) : null;

  const weekDays = getWeekDays(db, activeWeek.id);
  const slots = getSlotsView(db);

  const selectedDay = block ? weekDays[selectedBlock.dayIndex] : null;
  const selectedSlot = block ? slots[selectedBlock.startSlot] : null;

  const teacherOptions =
    block && selectedDay && selectedSlot
      ? getTeacherOptionsForBlock({
          db,
          courseType,
          block,
          dayId: selectedDay.id,
          startSlotId: selectedSlot.id,
          durationSlots: block.durationSlots,
        })
      : [];

  const gridTeacherValue = assignedTeacher?.id ?? "";
  const selectedTeacherLabel = assignedTeacher
    ? buildTeacherShortName(assignedTeacher)
    : "Aucun";

  return (
    <aside className="panel details-panel">
      <div className="panel-body details-panel-body">
        <div className="panel-section-title">Modification du cours</div>

        <div className="details-stack">
          <section className="details-section details-hero">
            <div className="details-label">Audience</div>
            <div className="details-title">{courseType.label}</div>
            <div className="details-subtitle">{courseType.subject}</div>
            <AudienceSummary courseType={courseType} />
            {paletteItem ? (
              <div className="details-inline-stats">
                <span className="details-stat">{paletteItem.remaining} restant(s)</span>
                <span className="details-stat">
                  {courseType.durationSlots} slot{courseType.durationSlots > 1 ? "s" : ""}
                </span>
              </div>
            ) : null}
          </section>
        </div>

        {block && (
          <>
            <div className="details-divider" />

            <div className="panel-section-title">Modification du creneau</div>

            <div className="details-stack">
              <section className="details-section details-card">
                <div className="details-label">Position</div>
                <div className="details-card-title">{activeWeek.label}</div>
                <div className="details-value">
                  {selectedDay?.weekdayLabel} · {selectedSlot?.label}
                </div>
              </section>

              <section className="details-section">
                <div className="details-label">Intervenant affecte</div>

                {teacherOptions.length === 0 ? (
                  <div className="details-value muted">Aucun enseignant renseigne</div>
                ) : (
                  <>
                    {hasSingleTeacher ? (
                      <div className="teacher-select teacher-select-readonly">
                        {buildTeacherShortName(linkedTeachers[0])}
                      </div>
                    ) : (
                      <div className="teacher-select-menu">
                        <button
                          type="button"
                          className="teacher-select-trigger"
                          onClick={() => setIsTeacherMenuOpen((prev) => !prev)}
                        >
                          <span>{selectedTeacherLabel}</span>
                          <span className="teacher-select-chevron" aria-hidden="true">
                            {isTeacherMenuOpen ? "▴" : "▾"}
                          </span>
                        </button>

                        {isTeacherMenuOpen && (
                          <div className="teacher-select-dropdown">
                            <button
                              type="button"
                              className={[
                                "teacher-select-option",
                                !gridTeacherValue ? "is-selected" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => {
                                onAssignTeacher?.({
                                  sessionInstanceId: selectedBlock.sessionInstanceId,
                                  teacherId: null,
                                });
                                setIsTeacherMenuOpen(false);
                              }}
                            >
                              <span className="teacher-option-name">Aucun</span>
                              <span className="teacher-option-meta">
                                Retirer l'affectation explicite
                              </span>
                            </button>

                            {teacherOptions.map(({ teacher, available, unavailableLabel }) => (
                              <button
                                key={teacher.id}
                                type="button"
                                className={[
                                  "teacher-select-option",
                                  teacher.id === gridTeacherValue ? "is-selected" : "",
                                  !available ? "is-disabled" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                disabled={!available}
                                onClick={() => {
                                  onAssignTeacher?.({
                                    sessionInstanceId: selectedBlock.sessionInstanceId,
                                    teacherId: teacher.id,
                                  });
                                  setIsTeacherMenuOpen(false);
                                }}
                              >
                                <span className="teacher-option-name">
                                  {buildTeacherShortName(teacher)}
                                </span>
                                <span className="teacher-option-meta">
                                  {available
                                    ? "Disponible"
                                    : unavailableLabel || "Indisponible"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
