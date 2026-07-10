import { registerHandler, processEvents } from './dispatcher';
import { handleImpactCreated } from './handlers/impact-created';
import { handleAdkarReviewNeeded } from './handlers/adkar-review-needed';
import { handleTrainingMatrixNeeded } from './handlers/training-matrix-needed';
import { handleCulturalAssessmentCompleted, handleCulturalAssessmentResponse } from './handlers/cultural-assessment';
import { handleTrainingCompleted } from './handlers/training-completed';

registerHandler('impact.created',                          handleImpactCreated);
registerHandler('stakeholder.adkar-review-needed',         handleAdkarReviewNeeded);
registerHandler('training.matrix-generation-needed',       handleTrainingMatrixNeeded);
registerHandler('training.completed',                      handleTrainingCompleted);
registerHandler('cultural_assessment.survey.completed',    handleCulturalAssessmentCompleted);
registerHandler('cultural_assessment.response.submitted',  handleCulturalAssessmentResponse);

export { processEvents };
