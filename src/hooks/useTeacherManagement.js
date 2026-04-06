import { useState } from "react";
import {
  addConstraintToDb,
  addTeacherToDb,
  createConstraint,
  deleteTeacherFromDb,
  removeConstraintFromDb,
  updateTeacherIdentityInDb,
} from "../planner/teacherManagement";

export default function useTeacherManagement({
  setDb,
  teacherMap,
  setPendingTeacherAssignments,
  setMessage,
  activeEditorPanel,
  setActiveEditorPanel,
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);

  const selectedTeacher = selectedTeacherId
    ? teacherMap[selectedTeacherId] ?? null
    : null;

  function showTeacherPanel(teacherId) {
    setSelectedTeacherId((prev) => {
      const nextId = prev === teacherId ? null : teacherId;

      if (nextId) {
        setActiveEditorPanel("teacher");
      } else if (activeEditorPanel === "teacher") {
        setActiveEditorPanel(null);
      }

      return nextId;
    });
  }

  function handleRenameTeacher({ teacherId, firstName, lastName }) {
    setDb((prev) =>
      updateTeacherIdentityInDb(prev, teacherId, { firstName, lastName })
    );
    setMessage("Intervenant mis à jour.");
  }

  function handleAddTeacher({ teacher, constraints }) {
    setDb((prev) => {
      let next = addTeacherToDb(prev, teacher);

      constraints.forEach((constraint) => {
        next = addConstraintToDb(next, constraint);
      });

      return next;
    });

    setMessage(
      `Intervenant ajouté : ${teacher.firstName} ${teacher.lastName}.`
    );
  }

  function handleAddTeacherUnavailability(rule) {
    if (!selectedTeacherId) return;

    const constraint = createConstraint({
      entityType: "teacher",
      entityId: selectedTeacherId,
      ...rule,
    });

    setDb((prev) => addConstraintToDb(prev, constraint));
    setMessage("Indisponibilité ajoutée.");
  }

  function handleRemoveTeacherUnavailability(constraintId) {
    setDb((prev) => removeConstraintFromDb(prev, constraintId));
    setMessage("Indisponibilité supprimée.");
  }

  function handleConfirmDeleteTeacher() {
    if (!teacherToDelete) return;

    setDb((prev) => deleteTeacherFromDb(prev, teacherToDelete.id));

    setPendingTeacherAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((requirementId) => {
        if (next[requirementId] === teacherToDelete.id) {
          delete next[requirementId];
        }
      });
      return next;
    });

    if (selectedTeacherId === teacherToDelete.id) {
      setSelectedTeacherId(null);
    }

    setTeacherToDelete(null);
    setMessage("Intervenant supprimé.");
  }

  return {
    selectedTeacherId,
    setSelectedTeacherId,
    teacherToDelete,
    setTeacherToDelete,
    isAddTeacherModalOpen,
    setIsAddTeacherModalOpen,
    selectedTeacher,
    showTeacherPanel,
    handleRenameTeacher,
    handleAddTeacher,
    handleAddTeacherUnavailability,
    handleRemoveTeacherUnavailability,
    handleConfirmDeleteTeacher,
  };
}