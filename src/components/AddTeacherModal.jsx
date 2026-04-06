import { useState } from "react";
import TeacherUnavailabilityEditor from "./TeacherUnavailabilityEditor";
import TeacherUnavailabilityList from "./TeacherUnavailabilityList";
import { createTeacher } from "../planner/teacherManagement";

export default function AddTeacherModal({
  isOpen,
  onClose,
  onSubmit,
  weeks,
  slots,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [unavailabilities, setUnavailabilities] = useState([]);

  if (!isOpen) return null;

  function resetForm() {
    setFirstName("");
    setLastName("");
    setUnavailabilities([]);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      return;
    }

    const newTeacher = createTeacher({
      firstName,
      lastName,
    });

    onSubmit({
      teacher: newTeacher,
      constraints: unavailabilities.map((rule) => ({
        ...rule,
        entityType: "teacher",
        entityId: newTeacher.id,
      })),
    });

    resetForm();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Ajouter un intervenant</h2>
          <button
            type="button"
            className="modal-close"
            onClick={() => {
              resetForm();
              onClose();
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Prénom</span>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Claire"
            />
          </label>

          <label className="form-field">
            <span>Nom</span>
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Martin"
            />
          </label>

          <TeacherUnavailabilityEditor
            weeks={weeks}
            slots={slots}
            onAddUnavailability={(rule) =>
              setUnavailabilities((prev) => [...prev, rule])
            }
          />

          <TeacherUnavailabilityList
            constraints={unavailabilities}
            weeks={weeks}
            slots={slots}
            onRemoveUnavailability={(ruleId) =>
              setUnavailabilities((prev) => prev.filter((item) => item.id !== ruleId))
            }
          />

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Annuler
            </button>
            <button type="submit" className="primary-button">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}