import { useState } from "react";
import {
  getBlockAssignedTeacher,
  getCourseTeachers,
  getTeacherOptionsForBlock,
} from "../planner/teachers";
import {
  getBlockAssignedRoom,
  getRoomOptionsForBlock,
} from "../planner/rooms";
import { buildTeacherShortName } from "../planner/teacherManagement";
import { getSlotsView, getWeekDays } from "../planner/dbSelectors";

function AudienceSummary({ courseType }) {
  return (
    <div className="details-chip-row">
      {courseType.promotionLabel ? (
        <span className="details-chip">{courseType.promotionLabel}</span>
      ) : null}
      {courseType.studentCount ? (
        <span className="details-chip">{courseType.studentCount} etudiants</span>
      ) : null}
    </div>
  );
}

function AssignmentMenu({
  valueLabel,
  valueId,
  noneLabel = "Aucun",
  noneDescription,
  options,
  onAssign,
  onClose,
}) {
  return (
    <div className="teacher-select-menu">
      <button type="button" className="teacher-select-trigger" onClick={onClose}>
        <span>{valueLabel}</span>
        <span className="teacher-select-chevron" aria-hidden="true">
          ▴
        </span>
      </button>

      <div className="teacher-select-dropdown">
        <button
          type="button"
          className={[
            "teacher-select-option",
            !valueId ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onAssign(null)}
        >
          <span className="teacher-option-name">{noneLabel}</span>
          <span className="teacher-option-meta">{noneDescription}</span>
        </button>

        {options.map(({ id, label, available, meta }) => (
          <button
            key={id}
            type="button"
            className={[
              "teacher-select-option",
              id === valueId ? "is-selected" : "",
              !available ? "is-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={!available}
            onClick={() => onAssign(id)}
          >
            <span className="teacher-option-name">{label}</span>
            <span className="teacher-option-meta">{meta}</span>
          </button>
        ))}
      </div>
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
  rooms,
  assignments,
  activeWeek,
  onAssignTeacher,
  onAssignRoom,
}) {
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);

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
  const assignedRoom = block ? getBlockAssignedRoom(block, rooms) : null;
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

  const roomOptions =
    block && selectedDay && selectedSlot
      ? getRoomOptionsForBlock({
          db,
          courseType,
          block,
          dayId: selectedDay.id,
          startSlotId: selectedSlot.id,
          durationSlots: block.durationSlots,
        })
      : [];

  const selectedTeacherLabel = assignedTeacher
    ? buildTeacherShortName(assignedTeacher)
    : "Aucun";
  const selectedRoomLabel = assignedRoom
    ? `${assignedRoom.label} (${assignedRoom.capacity} places)`
    : "Aucune";

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
                ) : hasSingleTeacher ? (
                  <div className="teacher-select teacher-select-readonly">
                    {buildTeacherShortName(linkedTeachers[0])}
                  </div>
                ) : isTeacherMenuOpen ? (
                  <AssignmentMenu
                    valueLabel={selectedTeacherLabel}
                    valueId={assignedTeacher?.id ?? ""}
                    noneDescription="Retirer l'affectation explicite"
                    options={teacherOptions.map(({ teacher, available, unavailableLabel }) => ({
                      id: teacher.id,
                      label: buildTeacherShortName(teacher),
                      available,
                      meta: available ? "Disponible" : unavailableLabel || "Indisponible",
                    }))}
                    onAssign={(teacherId) => {
                      onAssignTeacher?.({
                        sessionInstanceId: selectedBlock.sessionInstanceId,
                        teacherId,
                      });
                      setIsTeacherMenuOpen(false);
                    }}
                    onClose={() => setIsTeacherMenuOpen(false)}
                  />
                ) : (
                  <div className="teacher-select-menu">
                    <button
                      type="button"
                      className="teacher-select-trigger"
                      onClick={() => setIsTeacherMenuOpen(true)}
                    >
                      <span>{selectedTeacherLabel}</span>
                      <span className="teacher-select-chevron" aria-hidden="true">
                        ▾
                      </span>
                    </button>
                  </div>
                )}
              </section>

              <section className="details-section">
                <div className="details-label">Salle affectee</div>

                {roomOptions.length === 0 ? (
                  <div className="details-value muted">Aucune salle renseignee</div>
                ) : isRoomMenuOpen ? (
                  <AssignmentMenu
                    valueLabel={selectedRoomLabel}
                    valueId={assignedRoom?.id ?? ""}
                    noneLabel="Aucune"
                    noneDescription="Retirer l'affectation explicite"
                    options={roomOptions.map(({ room, available, unavailableLabel }) => ({
                      id: room.id,
                      label: `${room.label} (${room.capacity} places)`,
                      available,
                      meta: available ? "Disponible" : unavailableLabel || "Indisponible",
                    }))}
                    onAssign={(roomId) => {
                      onAssignRoom?.({
                        sessionInstanceId: selectedBlock.sessionInstanceId,
                        roomId,
                      });
                      setIsRoomMenuOpen(false);
                    }}
                    onClose={() => setIsRoomMenuOpen(false)}
                  />
                ) : (
                  <div className="teacher-select-menu">
                    <button
                      type="button"
                      className="teacher-select-trigger"
                      onClick={() => setIsRoomMenuOpen(true)}
                    >
                      <span>{selectedRoomLabel}</span>
                      <span className="teacher-select-chevron" aria-hidden="true">
                        ▾
                      </span>
                    </button>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
