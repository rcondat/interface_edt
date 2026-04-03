import { useState } from "react";
import { createUnavailability } from "../planner/teacherManagement";

const TYPE_OPTIONS = [
  { value: "weekly", label: "Hebdomadaire" },
  { value: "specific-weeks", label: "Semaines spécifiques" },
  { value: "date-range", label: "Période définie" },
  { value: "specific-date-time", label: "Date précise" },
];

export default function TeacherUnavailabilityEditor({
  weeks,
  slots,
  onAddUnavailability,
}) {
  const [type, setType] = useState("weekly");
  const [dayIndex, setDayIndex] = useState(0);
  const [startSlot, setStartSlot] = useState(0);
  const [endSlot, setEndSlot] = useState(1);
  const [selectedWeekIds, setSelectedWeekIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [date, setDate] = useState("");

  function toggleWeek(weekId) {
    setSelectedWeekIds((prev) =>
      prev.includes(weekId)
        ? prev.filter((id) => id !== weekId)
        : [...prev, weekId]
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (endSlot <= startSlot) return;

    const payload = createUnavailability({
      type,
      dayIndex: type === "weekly" || type === "specific-weeks" ? dayIndex : null,
      startSlot,
      endSlot,
      weekIds: type === "specific-weeks" ? selectedWeekIds : [],
      startDate: type === "date-range" ? startDate : "",
      endDate: type === "date-range" ? endDate : "",
      date: type === "specific-date-time" ? date : "",
    });

    onAddUnavailability(payload);
  }

  return (
    <form className="unavailability-form" onSubmit={handleSubmit}>
      <div className="details-label">Ajouter une indisponibilité</div>

      <label className="form-field">
        <span>Type</span>
        <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {(type === "weekly" || type === "specific-weeks") && (
        <label className="form-field">
          <span>Jour</span>
          <select
            className="form-control"
            value={dayIndex}
            onChange={(e) => setDayIndex(Number(e.target.value))}
          >
            <option value={0}>Lundi</option>
            <option value={1}>Mardi</option>
            <option value={2}>Mercredi</option>
            <option value={3}>Jeudi</option>
            <option value={4}>Vendredi</option>
          </select>
        </label>
      )}

      <div className="form-row">
        <label className="form-field">
          <span>Début</span>
          <select
            value={startSlot}
            onChange={(e) => setStartSlot(Number(e.target.value))}
          >
            {slots.map((slot, index) => (
              <option key={slot.id} value={index}>
                {slot.start}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Fin</span>
          <select
            value={endSlot}
            onChange={(e) => setEndSlot(Number(e.target.value))}
          >
            {slots.map((slot, index) => (
              <option key={slot.id} value={index + 1}>
                {slot.end}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === "specific-weeks" && (
        <div className="form-field">
          <span>Semaines</span>
          <div className="week-pills">
            {weeks.map((week) => (
              <button
                key={week.id}
                type="button"
                className={
                  selectedWeekIds.includes(week.id)
                    ? "week-pill week-pill-active"
                    : "week-pill"
                }
                onClick={() => toggleWeek(week.id)}
              >
                {week.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "date-range" && (
        <div className="form-row">
          <label className="form-field">
            <span>Date début</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Date fin</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
      )}

      {type === "specific-date-time" && (
        <label className="form-field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}

      <div className="modal-actions">
        <button type="submit" className="primary-button">
          Ajouter l’indisponibilité
        </button>
      </div>
    </form>
  );
}