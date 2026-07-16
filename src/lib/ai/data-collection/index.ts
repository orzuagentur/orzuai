export type {
  CollectionGapResult,
  CollectionNiche,
  ContactCollectionSnapshot,
  DataCollectionCrmMap,
  DataCollectionField,
  DataCollectionFieldType,
} from "./types";
export {
  COLLECTION_CUSTOM_FIELDS_KEY,
  COLLECTION_NICHES,
  DATA_COLLECTION_CRM_MAPS,
  DATA_COLLECTION_FIELD_TYPES,
  dataCollectionFieldSchema,
  dataCollectionFieldsSchema,
  isCollectionNiche,
  parseDataCollectionFields,
} from "./types";
export {
  COLLECTION_NICHE_LABELS,
  getCollectionNichePreset,
  resolveDataCollectionFields,
} from "./presets";
export {
  computeCollectionGaps,
  mapCollectedAnswersToContactUpdates,
  mergeCollectionAnswersIntoCustomFields,
} from "./gap-engine";
export { formatCollectionGapsForPrompt } from "./format-for-prompt";
