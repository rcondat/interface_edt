import { useEffect, useState } from "react";
import TeacherUnavailabilityEditor from "./TeacherUnavailabilityEditor";
import TeacherUnavailabilityList from "./TeacherUnavailabilityList";
import {
  buildTeacherDisplayName,
  buildTeacherShortName,
} from "../planner/teacherManagement";

export default function TeacherDetailsPanel({
  teacher,
  weeks,
  slots,
  onAddUnavailability,
  onRemoveUnavailability,
  onRenameTeacher,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!teacher) return;
    setFirstName(teacher.firstName ?? "");
    setLastName(teacher.lastName ?? "");
  }, [teacher]);

  if (!teacher) {
    return null;
  }

  const displayName = buildTeacherDisplayName(teacher);
  const shortName = buildTeacherShortName(teacher);

  const isDirty =
    firstName !== (teacher.firstName ?? "") ||
    lastName !== (teacher.lastName ?? "");

  const isInvalid = !firstName.trim() || !lastName.trim();

  function handleSubmit(event) {
    event.preventDefault();
    if (isInvalid || !isDirty) return;

    onRenameTeacher?.({
      teacherId: teacher.id,
      firstName,
      lastName,
    });
  }

  return (
    <section className="panel teacher-details-panel">
      <div className="panel-header">
        <h2>Modification intervenant</h2>
      </div>

      <div className="panel-body details-stack">
        <section className="details-section">
          <div className="details-label">Intervenant sélectionné</div>
          <div className="details-title">{displayName}</div>
          <div className="details-subtitle">{shortName}</div>
        </section>

        <div className="details-divider" />

        <section className="details-section">
          <div className="details-label">Identité</div>

          <form className="teacher-identity-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="form-field">
                <span>Prénom</span>
                <input
                  type="text"
                  className="form-control"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Prénom"
                />
              </label>

              <label className="form-field">
                <span>Nom</span>
                <input
                  type="text"
                  className="form-control"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Nom"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isInvalid || !isDirty}
              >
                Valider
              </button>
            </div>
          </form>
        </section>

        <div className="details-divider" />

        <TeacherUnavailabilityEditor
          weeks={weeks}
          slots={slots}
          onAddUnavailability={onAddUnavailability}
        />

        <TeacherUnavailabilityList
          teacher={teacher}
          weeks={weeks}
          slots={slots}
          onRemoveUnavailability={onRemoveUnavailability}
        />
      </div>
    </section>
  );
}