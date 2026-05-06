import { registerHandler, processEvents } from './dispatcher';
import { handleImpactCreated } from './handlers/impact-created';
import { handleAdkarReviewNeeded } from './handlers/adkar-review-needed';

// Register all known handlers (side-effect on import)
registerHandler('impact.created', handleImpactCreated);
registerHandler('stakeholder.adkar-review-needed', handleAdkarReviewNeeded);

export { processEvents };
