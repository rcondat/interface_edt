import TeacherUnavailabilityEditor from "./TeacherUnavailabilityEditor";
import TeacherUnavailabilityList from "./TeacherUnavailabilityList";
import { buildTeacherDisplayName, buildTeacherShortName } from "../planner/teacherManagement";

export default function TeacherDetailsPanel({
  teacher,
  weeks,
  slots,
  onAddUnavailability,
  onRemoveUnavailability,
}) {
  if (!teacher) {
    return null;
  }

  return (
    <section className="panel teacher-details-panel">
      <div className="panel-header">
        <h2>Disponibilités intervenant</h2>
      </div>

      <div className="panel-body details-stack">
        <section className="details-section">
          <div className="details-label">Intervenant</div>
          <div className="details-title">{buildTeacherDisplayName(teacher)}</div>
          <div className="details-subtitle">{buildTeacherShortName(teacher)}</div>
        </section>

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