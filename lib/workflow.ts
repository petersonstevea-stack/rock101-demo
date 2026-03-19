export type WorkflowState = {
  instructorSubmitted: boolean;
  directorSubmitted: boolean;
  graduationInstructorSubmitted: boolean;
  graduationDirectorSubmitted: boolean;
  parentSubmitted: boolean;
};

export const createEmptyWorkflowState = (): WorkflowState => ({
  instructorSubmitted: false,
  directorSubmitted: false,
  graduationInstructorSubmitted: false,
  graduationDirectorSubmitted: false,
  parentSubmitted: false,
});

export const isReadyToSendToParents = (workflow: WorkflowState): boolean => {
  return (
    workflow.instructorSubmitted &&
    workflow.directorSubmitted &&
    workflow.graduationDirectorSubmitted &&
    !workflow.parentSubmitted
  );
};

export const resetInstructorWorkflow = (
  workflow: WorkflowState
): WorkflowState => ({
  ...workflow,
  instructorSubmitted: false,
  parentSubmitted: false,
});

export const resetDirectorWorkflow = (
  workflow: WorkflowState
): WorkflowState => ({
  ...workflow,
  directorSubmitted: false,
  parentSubmitted: false,
});

export const resetInstructorGraduationWorkflow = (
  workflow: WorkflowState
): WorkflowState => ({
  ...workflow,
  graduationInstructorSubmitted: false,
  parentSubmitted: false,
});

export const resetDirectorGraduationWorkflow = (
  workflow: WorkflowState
): WorkflowState => ({
  ...workflow,
  graduationDirectorSubmitted: false,
  parentSubmitted: false,
});