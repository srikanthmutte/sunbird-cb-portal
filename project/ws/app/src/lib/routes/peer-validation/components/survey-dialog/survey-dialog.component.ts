import { Component, Inject, OnInit, OnDestroy, ViewChild, Renderer2 } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms'
import { MatStepper } from '@angular/material/stepper'
import { DOCUMENT } from '@angular/common'
import { NSPeerValidation } from '../../models/peer-validation.model'
import { PeerValidationService } from '../../services/peer-validation.service'
import { SuccessDialogComponent } from './components/success-dialog/success-dialog.component'

@Component({
  selector: 'ws-app-survey-dialog',
  templateUrl: './survey-dialog.component.html',
  styleUrls: ['./survey-dialog.component.scss'],
})
export class SurveyDialogComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper

  currentStep = 0
  surveyQuestions: NSPeerValidation.ISurveyQuestion[] = []
  questionForm!: FormGroup
  uploadedDocuments: NSPeerValidation.IUploadedDocument[] = []
  isLoadingQuestions = false
  isSubmitting = false
  questionsError: string | null = null
  selectedPeers: { peers: any[], isValid: boolean } = {
    peers: [],
    isValid: false,
  }

  constructor(
    public dialogRef: MatDialogRef<SurveyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NSPeerValidation.ISurveyPopupData,
    @Inject(DOCUMENT) private document: Document,
    private fb: FormBuilder,
    private renderer: Renderer2,
    private peerValidationService: PeerValidationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.data.isSurveySubmitted = true
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden')
    this.loadSurveyQuestions()
    this.initializeForm()
  }

  ngOnDestroy() {
    this.renderer.removeStyle(this.document.body, 'overflow')
  }

  loadSurveyQuestions() {
    this.isLoadingQuestions = true
    this.questionsError = null
    this.peerValidationService.getSurveyQuestions(this.data.formId).subscribe({
      next: questions => {
        this.surveyQuestions = questions
        this.buildQuestionForm()
        this.isLoadingQuestions = false
      },
      error: err => {
        this.isLoadingQuestions = false
        const status = err?.status
        if (err?.message) {
          this.questionsError = err.message
        } else if (status === 502 || status === 503 || status === 504) {
          this.questionsError = 'Unable to reach the server. Please try again later.'
        } else if (status === 404) {
          this.questionsError = 'Survey form not found. Please contact support.'
        } else {
          this.questionsError = 'Failed to load survey questions. Please try again.'
        }
      },
    })
  }

  initializeForm() {
    this.questionForm = this.fb.group({
      responses: this.fb.array([]),
    })
  }

  buildQuestionForm() {
    const responsesArray = this.questionForm.get('responses') as FormArray
    this.surveyQuestions.forEach(question => {
      if (question.type === 'numericRating') {
        responsesArray.push(this.fb.control(null, question.required ? Validators.required : []))
      } else if (question.type === 'radio') {
        // Radio: single selection from options, starts as null (nothing selected)
        responsesArray.push(this.fb.control(null, question.required ? Validators.required : []))
      } else if (question.type === 'checkbox') {
        // For checkbox, we need a custom validator to ensure at least one option is selected
        const checkboxValidators = question.required
          ? [Validators.required, (control: any) => {
            return control.value && control.value.length > 0 ? null : { required: true }
          }]
          : []
        responsesArray.push(this.fb.control([], checkboxValidators))
      } else {
        // textArea and any other types
        responsesArray.push(this.fb.control('', question.required ? Validators.required : []))
      }
    })
  }

  get responses(): FormArray {
    return this.questionForm.get('responses') as FormArray
  }

  onStepChange(event: any) {
    this.currentStep = event.selectedIndex
  }

  onDocumentsChanged(documents: NSPeerValidation.IUploadedDocument[]) {
    this.uploadedDocuments = documents
  }

  onPeersChanged(peerData: { peers: any[], isValid: boolean }) {
    this.selectedPeers = peerData
  }

  canProceedToStep2(): boolean {
    return this.questionForm.valid
  }

  isStep2Completed = false

  completeStep2() {
    this.isStep2Completed = true
    // Wait for view update
    setTimeout(() => {
      this.stepper.next()
    }, 0)
  }

  isStepCompleted(index: number): boolean {
    if (index === 0) {
      return this.questionForm.valid
    } else if (index === 1) {
      return this.isStep2Completed
    }
    return false
  }

  canSubmit(): boolean {
    return this.selectedPeers.isValid
  }

  onSubmit() {
    if (!this.canSubmit() || this.isSubmitting) {
      return
    }
    this.isSubmitting = true

    const peerIds: string[] = this.selectedPeers.peers.map((p: any) => p.id || p.userId || p)

    const attachments: string[] = this.uploadedDocuments.map(d => d.url)

    const responses: NSPeerValidation.ISubmitResponse[] = this.surveyQuestions.map((q, index) => {
      const rawValue = this.responses.at(index).value
      let answer: number | string | string[] = rawValue
      if (q.type === 'numericRating') {
        answer = Number(rawValue)
      }
      return {
        questionId: q.id,
        question: q.text,
        answer,
        answerType: q.type === 'textArea' ? 'textarea' : q.type,
        isRequired: q.required,
      }
    })

    const submission: NSPeerValidation.ISurveySubmission = {
      formId: this.data.formId,
      contextId: this.data.contextId || this.data.courseId || '',
      contextName: this.data.courseName,
      contextOrgId: this.data.contextOrgId || '',
      version: 1,
      status: 'SUBMITTED',
      notificationId: this.data.notificationId || '',
      createdAt: this.data.createdAt || '',
      thumbnail: this.data.thumbnail || '',
      peerIds,
      attachments,
      responses,
      submissionMeta: {
        submittedFrom: 'web',
        userAgent: navigator.userAgent,
        ipAddress: '',
      },
    }
    this.peerValidationService.submitSurvey(submission).subscribe({
      next: (res: any) => {
        if (res?.params?.status === 'failed' || res?.responseCode === 'BAD_REQUEST') {
          const errMsg = res?.params?.errMsg || 'Failed to submit survey. Please try again.'
          this.isSubmitting = false
          this.snackBar.open(errMsg, 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          })
          return
        }
        this.peerValidationService.dashboardRefresh$.next()
        this.dialogRef.close('submitted')
        this.showSuccessDialog()
      },
      error: err => {
        console.error('Submission error:', err)
        this.isSubmitting = false
        const errMsg = err?.error?.params?.errMsg || 'Failed to submit survey. Please try again.'
        this.snackBar.open(errMsg, 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        })
      },
    })
  }

  showSuccessDialog() {
    this.dialog.open(SuccessDialogComponent, {
      width: '400px',
      disableClose: true,
    })
  }

  onClose() {
    this.dialogRef.close()
  }
}
