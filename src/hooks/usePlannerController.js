import usePlannerData from "./usePlannerData";
import useTeacherManagement from "./useTeacherManagement";
import usePlannerInteraction from "./usePlannerInteraction";
import { useState } from "react";
import buildDbFromDraft from "../planner/buildDbFromDraft";

export default function usePlannerController() {

  const {
    db,
    setDb,
    activeWeekId,
    setActiveWeekId,
    semester,
    courseTypes,
    paletteItems,
    teachers,
    assignments,
    teacherMap,
    activeWeek,
    weekDayLabels,
    promotions,
  } = usePlannerData();

  const interaction = usePlannerInteraction({
    db,
    setDb,
    activeWeekId,
    setActiveWeekId,
    semester,
    courseTypes,
    paletteItems,
    assignments,
    weekDayLabels,
  });

  const teacherManagement = useTeacherManagement({
    setDb,
    teacherMap,
    setPendingTeacherAssignments: interaction.setPendingTeacherAssignments,
    setMessage: interaction.setMessage,
    activeEditorPanel: interaction.activeEditorPanel,
    setActiveEditorPanel: interaction.setActiveEditorPanel,
  });

  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);

  function handleCreateSchedule(draft) {
    const nextDb = buildDbFromDraft(draft);
    const firstWeekId = nextDb.semesters[0]?.weekIds?.[0] ?? "week-1";

    setDb(nextDb);
    interaction.resetForNewSchedule({
      firstWeekId,
      message: "Nouvel EDT créé.",
    });
    teacherManagement.resetTeacherManagement();
    setIsNewScheduleModalOpen(false);
  }

  return {
    sensors: interaction.sensors,
    db,
    semester,
    courseTypes,
    paletteItems,
    teachers,
    assignments,
    teacherMap,
    weekDayLabels,
    activeWeek,
    activeWeekId,

    recentPlacement: interaction.recentPlacement,
    isAddTeacherModalOpen: teacherManagement.isAddTeacherModalOpen,
    setIsAddTeacherModalOpen: teacherManagement.setIsAddTeacherModalOpen,
    selectedTeacherId: teacherManagement.selectedTeacherId,
    teacherToDelete: teacherManagement.teacherToDelete,
    setTeacherToDelete: teacherManagement.setTeacherToDelete,
    selectedTeacher: teacherManagement.selectedTeacher,
    
    selectedBlock: interaction.selectedBlock,
    pendingTeacherAssignments: interaction.pendingTeacherAssignments,
    selectedCourseTypeId: interaction.selectedCourseTypeId,
    setSelectedCourseTypeId: interaction.setSelectedCourseTypeId,
    activeDragItem: interaction.activeDragItem,
    activeDropTarget: interaction.activeDropTarget,
    message: interaction.message,
    selectedPaletteCourseId: interaction.selectedPaletteCourseId,
    activeEditorPanel: interaction.activeEditorPanel,

    showTeacherPanel: teacherManagement.showTeacherPanel,
    showCoursePanelFromPalette: interaction.showCoursePanelFromPalette,
    showWeekPanel: interaction.showWeekPanel,
    handleRenameTeacher: teacherManagement.handleRenameTeacher,
    handleAssignTeacher: interaction.handleAssignTeacher,
    handleAddTeacher: teacherManagement.handleAddTeacher,
    handleAddTeacherUnavailability: teacherManagement.handleAddTeacherUnavailability,
    handleRemoveTeacherUnavailability: teacherManagement.handleRemoveTeacherUnavailability,
    handleConfirmDeleteTeacher: teacherManagement.handleConfirmDeleteTeacher,
    handlePaletteDragStart: interaction.handlePaletteDragStart,
    handleCellClick: interaction.handleCellClick,
    handleDragStart: interaction.handleDragStart,
    handleDragOver: interaction.handleDragOver,
    handleDragEnd: interaction.handleDragEnd,
    handleDragCancel: interaction.handleDragCancel,
    handleSelectBlock: interaction.handleSelectBlock,
    handleRemoveCourse: interaction.handleRemoveCourse,

    isNewScheduleModalOpen,
    setIsNewScheduleModalOpen,
    handleCreateSchedule,

    promotions,
    visiblePromotionIds: interaction.visiblePromotionIds,
    toggleVisiblePromotion: interaction.toggleVisiblePromotion,
    showAllPromotions: interaction.showAllPromotions,
  };
}
