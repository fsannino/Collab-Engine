import { registerHandler, processEvents } from './dispatcher';
import { handleImpactCreated } from './handlers/impact-created';
import { handleAdkarReviewNeeded } from './handlers/adkar-review-needed';
import { handleTrainingMatrixNeeded } from './handlers/training-matrix-needed';

registerHandler('impact.created',                     handleImpactCreated);
registerHandler('stakeholder.adkar-review-needed',    handleAdkarReviewNeeded);
registerHandler('training.matrix-generation-needed',  handleTrainingMatrixNeeded);
// training.created / training.completed — Sprint 4 readiness module

export { processEvents };
