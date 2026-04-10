export namespace NSPeerValidation {
  // Survey Question Types
  export interface ISurveyQuestion {
    id: string
    text: string
    type: 'numericRating' | 'textArea' | 'radio' | 'checkbox'
    required: boolean
    maxLength?: number
    options?: string[] // For radio and checkbox questions
    minLabel?: string  // For numericRating
    maxLabel?: string  // For numericRating
    ratingCount?: number // Number of rating buttons
  }

  // Survey Response
  export interface ISurveyResponse {
    questionId: string
    value: number | string | string[] // Array for multi-select
  }

  // Attachment (name + url pair submitted with survey)
  export interface IAttachment {
    name: string
    url: string
  }

  // Uploaded Document
  export interface IUploadedDocument {
    id: string
    name: string
    type: string
    size: number
    url: string          // converted URL used for both preview and submit
    uploadedAt: Date
  }

  // Peer Information
  export interface IPeerInfo {
    id: string
    name: string
    email: string
    designation: string
  }

  // Submit Response item — matches POST /apis/proxies/v8/forms/peersurvey/submit
  export interface ISubmitResponse {
    questionId: string
    question: string
    answer: number | string | string[]
    answerType: string
    isRequired?: boolean
  }

  // Survey Submission — matches POST /apis/proxies/v8/forms/peersurvey/submit
  export interface ISurveySubmission {
    formId: string
    contextId: string
    contextName: string
    contextOrgId: string
    version: number
    status: string
    notificationId: string
    createdAt: string
    thumbnail: string
    peerIds: string[]
    attachments: IAttachment[]
    responses: ISubmitResponse[]
    submissionMeta: {
      submittedFrom: string
      userAgent: string
      ipAddress: string
    }
  }

  // Survey Popup Data
  export interface ISurveyPopupData {
    learnerName: string
    courseName: string
    completionDate: string
    formId: string
    courseId?: string
    contextId?: string
    contextOrgId?: string
    isSurveySubmitted?: boolean
    surveyCreatedById?: string
    surveyEndDate?: string
    notificationId?: string
    createdAt?: string
    thumbnail?: string
  }

  // Dashboard Item — mirrors raw API response structure
  export interface IDashboardItem {
    notification_id: string
    status: string                 // root-level status: "PENDING", "COMPLETED", "EXPIRED" etc.
    sub_category?: string          // optional — determined by query subType, not in response body
    survey_end_date: string
    created_at: string
    updated_at: string | null
    user_id: string
    action: string | null
    action_at: string | null
    isExpired?: boolean
    metadata: {
      contextId: string
      formId: string
      courseName: string
      isSurveySubmitted: boolean
      completionDate: string
      surveyCreatedById: string
      surveyEndDate: string
      surveyName?: string          // survey title from real API
      learnerName: string
      thumbnail?: string           // course thumbnail image from notification data
      courceImageUrl?: string      // optional — not present in real API response
      requestedName?: string
      submittedBy?: string
      learnerId?: string            // learner's user ID from incoming request API
      courseId?: string
      contextOrgId?: string
    }
  }

  // Dashboard Filters
  export interface IDashboardFilters {
    tab: number
    search: string
    sortBy: string
    dateFilter: string
    pageIndex: number
    pageSize: number
  }

  // Individual submission response item (from API)
  export interface ISubmissionResponse {
    questionId: string
    question: string
    answer: string | number
    answerType: string
    isRequired?: boolean
  }

  // Review Request — maps to result.response.content[0] from submission search API
  export interface IReviewRequest {
    submissionId: string
    formId: string
    submittedBy: string
    learnerName: string     // fullName
    courseName: string      // contextName
    completionDate: string  // formatted submittedDate
    contextId: string
    contextOrgId: string
    status: string
    responses: ISubmissionResponse[]
    attachments: IAttachment[]
  }

  // Review Submission — matches POST /apis/proxies/v8/forms/peersurvey/submit
  export interface IReviewSubmission {
    actionType: 'REVIEW'
    submissionId: string
    reviewStatus: 'APPROVED' | 'REJECTED'
    notificationId: string
    createdAt: string
  }

  // Enums
  export enum ESurveyStatus {
    ACTIVE = 'Active',
    EXPIRED = 'Ended',
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
  }
}
