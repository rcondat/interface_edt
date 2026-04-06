import { useState } from "react";

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
  const [timeScopeType, setTimeScopeType] = useState("weekly");
  const [dayIndex, setDayIndex] = useState(0);
  const [startSlotId, setStartSlotId] = useState(slots[0]?.id ?? "");
  const [endSlotId, setEndSlotId] = useState(slots[1]?.id ?? slots[0]?.id ?? "");
  const [selectedWeekIds, setSelectedWeekIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [date, setDate] = useState("");

  const slotIndexById = Object.fromEntries(
    slots.map((slot, index) => [slot.id, index])
  );

  function toggleWeek(weekId) {
    setSelectedWeekIds((prev) =>
      prev.includes(weekId)
        ? prev.filter((id) => id !== weekId)
        : [...prev, weekId]
    );
  }

  function resetFields() {
    setTimeScopeType("weekly");
    setDayIndex(0);
    setStartSlotId(slots[0]?.id ?? "");
    setEndSlotId(slots[1]?.id ?? slots[0]?.id ?? "");
    setSelectedWeekIds([]);
    setStartDate("");
    setEndDate("");
    setDate("");
  }

  function handleAddClick() {
    if ((slotIndexById[endSlotId] ?? 0) <= (slotIndexById[startSlotId] ?? 0)) {
      return;
    }

    onAddUnavailability({
      timeScopeType,
      dayIndex:
        timeScopeType === "weekly" || timeScopeType === "specific-weeks"
          ? dayIndex
          : null,
      startSlotId,
      endSlotId,
      weekIds: timeScopeType === "specific-weeks" ? selectedWeekIds : [],
      startDate: timeScopeType === "date-range" ? startDate : null,
      endDate: timeScopeType === "date-range" ? endDate : null,
      date: timeScopeType === "specific-date-time" ? date : null,
      dayId: null,
      slotId: null,
    });

    resetFields();
  }

  return (
    <div className="unavailability-form">
      <div className="details-label">Ajouter une indisponibilité</div>

      <label className="form-field">
        <span>Type</span>
        <select
          className="form-control"
          value={timeScopeType}
          onChange={(e) => setTimeScopeType(e.target.value)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {(timeScopeType === "weekly" || timeScopeType === "specific-weeks") && (
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
            className="form-control"
            value={startSlotId}
            onChange={(e) => setStartSlotId(e.target.value)}
          >
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.start ?? slot.startTime}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Fin</span>
          <select
            className="form-control"
            value={endSlotId}
            onChange={(e) => setEndSlotId(e.target.value)}
          >
            {slots.slice(1).map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.end ?? slot.endTime}
              </option>
            ))}
          </select>
        </label>
      </div>

      {timeScopeType === "specific-weeks" && (
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

      {timeScopeType === "date-range" && (
        <div className="form-row">
          <label className="form-field">
            <span>Date début</span>
            <input
              className="form-control"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Date fin</span>
            <input
              className="form-control"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
      )}

      {timeScopeType === "specific-date-time" && (
        <label className="form-field">
          <span>Date</span>
          <input
            className="form-control"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}

      <div className="modal-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleAddClick}
        >
          Ajouter une indisponibilité
        </button>
      </div>
    </div>
  );
}