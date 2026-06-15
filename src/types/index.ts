export type {
  AiSettings,
  Analytics,
  AuthProvider,
  Business,
  Contact,
  Conversation,
  ConversationStatus,
  Database,
  Enums,
  Json,
  KnowledgeCategory,
  KnowledgeEntry,
  Message,
  MessageSenderType,
  Tables,
  TablesInsert,
  TablesUpdate,
  User,
  InstagramConnection,
  InstagramStatus,
  TelegramConnection,
  TelegramStatus,
  WhatsappConnection,
  WhatsappStatus,
} from "./database.types";

export type {
  ApiErrorDetail,
  ApiFailure,
  ApiResult,
  ApiSuccess,
  PaginatedResult,
} from "./api.types";

export type {
  ActivityDataPoint,
  AnalyticsCardConfig,
  DashboardMetrics,
  DashboardOverview,
  DashboardUserProfile,
  RecentConversationItem,
} from "./dashboard.types";

export type {
  AuthActionResult,
  AuthCallbackQuery,
  AuthConfirmQuery,
  AuthProviderType,
  LoginErrorCode,
  LoginResult,
  PasswordResetErrorCode,
  PasswordResetRequestResult,
  PasswordUpdateResult,
  RegisterWithEmailInput,
  RegisterWithEmailPayload,
  RegistrationErrorCode,
  RegistrationResult,
  RequestPasswordResetInput,
  ResendVerificationEmailInput,
  ResetPasswordInput,
  ResetPasswordPayload,
  SignInWithEmailInput,
  VerificationErrorCode,
  VerificationResult,
} from "./auth.types";

export type {
  EmailSendSuccess,
  EmailServiceErrorCode,
  EmailServiceResult,
  SendPasswordResetEmailInput,
  SendVerificationEmailInput,
} from "./email.types";

export type {
  GeminiConversationMessage,
  GeminiGenerationSuccess,
  GeminiKnowledgeContext,
  GeminiServiceErrorCode,
  GeminiServiceResult,
  GenerateAssistantReplyInput,
  GenerateTextInput,
} from "./gemini.types";

export type {
  CreateKnowledgeEntryResult,
  DeleteKnowledgeEntryResult,
  KnowledgeActionError,
  KnowledgeActionResult,
  KnowledgeEntryData,
  KnowledgeEntryInput,
  KnowledgeErrorCode,
  KnowledgeSearchFilters,
  UpdateKnowledgeEntryInput,
  UpdateKnowledgeEntryResult,
} from "./knowledge.types";
export {
  KNOWLEDGE_CATEGORIES,
  knowledgeCategorySchema,
  knowledgeEntrySchema,
  updateKnowledgeEntrySchema,
} from "./knowledge.types";

export type {
  BusinessActionError,
  BusinessActionResult,
  BusinessErrorCode,
  BusinessPayload,
  BusinessProfileData,
  BusinessProfileInput,
  CreateBusinessInput,
  CreateBusinessResult,
  UpdateBusinessInput,
  UpdateBusinessResult,
  UploadBusinessLogoResult,
} from "./business.types";

export type {
  CompleteEmbeddedSignupInput,
  CompleteEmbeddedSignupResult,
  SyncWhatsAppResult,
  WhatsAppActionError,
  WhatsAppActionResult,
  WhatsAppConnectConfig,
  WhatsAppConnectionData,
  ConnectManualWhatsAppInput,
  ConnectManualWhatsAppResult,
  WhatsAppEmbeddedSignupConfig,
  WhatsAppErrorCode,
  WhatsAppWebhookMessage,
  WhatsAppWebhookPayload,
} from "./whatsapp.types";
export {
  completeEmbeddedSignupSchema,
  connectManualWhatsAppSchema,
} from "./whatsapp.types";

export type {
  InstagramActionError,
  InstagramActionResult,
  ConnectManualInstagramInput,
  ConnectManualInstagramResult,
  InstagramConnectConfig,
  InstagramConnectionData,
  InstagramEmbeddedSignupConfig,
  InstagramErrorCode,
} from "./instagram.types";
export { connectManualInstagramSchema } from "./instagram.types";

export type {
  TelegramActionError,
  TelegramActionResult,
  TelegramConnectConfig,
  TelegramConnectionData,
  TelegramErrorCode,
} from "./telegram.types";
export { telegramConnectSchema } from "./telegram.types";

export type {
  ChatMessageData,
  ChatActionError,
  ChatActionResult,
  ChatErrorCode,
  ConversationDetail,
  ConversationListItem,
  SendChatMessageInput,
  SendChatMessageResult,
  ToggleChatAiInput,
  ToggleChatAiResult,
} from "./chat.types";
export {
  sendChatMessageSchema,
  toggleChatAiSchema,
} from "./chat.types";
