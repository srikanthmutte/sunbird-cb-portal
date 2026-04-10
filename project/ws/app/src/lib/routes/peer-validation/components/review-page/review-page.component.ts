import { Component, OnInit } from '@angular/core'
import { Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { PeerValidationService } from '../../services/peer-validation.service'
import { NSPeerValidation } from '../../models/peer-validation.model'
import { SuccessDialogComponent } from '../survey-dialog/components/success-dialog/success-dialog.component'
import { VideoPreviewDialogComponent } from '../survey-dialog/components/video-preview-dialog/video-preview-dialog.component'

@Component({
  selector: 'ws-app-review-page',
  templateUrl: './review-page.component.html',
  styleUrls: ['./review-page.component.scss'],
})
export class ReviewPageComponent implements OnInit {
  requestId: string | null = null
  requestData: NSPeerValidation.IReviewRequest | null = null
  // From navigation state (passed by VerificationRequestDialogComponent)
  requestedName: string | null = null
  requestedRole: string | null = null
  courseName: string | null = null
  formId: string | null = null
  submittedBy: string | null = null
  courseId: string | null = null
  isReviewSubmitted = false
  isLoadingSubmission = false
  notificationId: string | null = null
  createdAt: string | null = null
  // Confirmation Checkbox
  clarificationChecked = false

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private peerValidationService: PeerValidationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit() {
    // Read data from query params (reliable) with router state as fallback
    const queryParams = this.route.snapshot.queryParams
    const nav = this.router.getCurrentNavigation()
    const state = nav?.extras?.state || (window.history.state || {})

    this.requestedName = queryParams['requestedName'] || state['requestedName'] || null
    this.requestedRole = queryParams['requestedRole'] || state['requestedRole'] || null
    this.courseName = queryParams['courseName'] || state['courseName'] || null
    this.formId = queryParams['formId'] || state['formId'] || null
    this.submittedBy = queryParams['submittedBy'] || state['submittedBy'] || null
    this.courseId = queryParams['courseId'] || state['courseId'] || null
    this.notificationId = queryParams['notificationId'] || state['notificationId'] || null
    this.createdAt = queryParams['createdAt'] || state['createdAt'] || null
    this.isReviewSubmitted = state['isReviewSubmitted'] || false
    const surveyEndDate = queryParams['surveyEndDate'] || state['surveyEndDate'] || null


    if (surveyEndDate && new Date(surveyEndDate) < new Date()) {
      this.snackBar.open('Survey has ended.', 'X', { duration: 3000 })
      this.location.back()
      return
    }

    this.requestId = this.route.snapshot.paramMap.get('id')
    if (this.submittedBy && this.formId) {
      this.fetchSubmission(this.submittedBy, this.formId, this.courseId || '')
    }
  }

  fetchSubmission(submittedBy: string, formId: string, courseId: string) {
    this.isLoadingSubmission = true
    this.peerValidationService.getSubmission(submittedBy, formId, courseId).subscribe({
      next: data => {
        this.isLoadingSubmission = false
        if (!data) return
        this.requestData = data
        if (!this.courseName) this.courseName = data.courseName || null
        if (!this.requestedName) this.requestedName = data.learnerName || null
      },
      error: () => {
        this.isLoadingSubmission = false
      },
    })
  }

  // Attachment URL helpers
  getAttachmentName(url: string): string {
    return url.split('/').pop()?.split('?')[0] || url
  }

  isPdf(url: string): boolean {
    return /\.pdf(\?|$)/i.test(url)
  }

  isVideo(url: string): boolean {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
  }

  isImage(url: string): boolean {
    return /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url)
  }

  openAttachment(url: string) {
    window.open(url, '_blank')
  }

  goBack() {
    this.clearHistoryStateAndGoBack()
  }

  clearHistoryStateAndGoBack() {
    const dashboardUrl = this.router.serializeUrl(this.router.createUrlTree(['/app/peer-validation']))
    window.history.replaceState({}, '', dashboardUrl)
    this.location.back()
  }

  submitDecision(reviewStatus: 'APPROVED' | 'REJECTED') {
    const submissionId = this.requestData?.submissionId || ''
    if (!submissionId || !this.notificationId) {
      this.snackBar.open('Missing submission or notification details.', 'X', { duration: 3000 })
      return
    }
    const submission: NSPeerValidation.IReviewSubmission = {
      actionType: 'REVIEW',
      submissionId,
      reviewStatus,
      notificationId: this.notificationId,
      createdAt: this.createdAt || '',
    }
    this.peerValidationService.submitReview(submission).subscribe({
      next: (res: any) => {
        if (res?.params?.status === 'failed' || res?.responseCode === 'BAD_REQUEST') {
          const errMsg = res?.params?.errMsg || 'Failed to submit review. Please try again.'
          this.snackBar.open(errMsg, 'X', { duration: 4000 })
          return
        }
        this.peerValidationService.dashboardRefresh$.next()
        const dialogRef = this.dialog.open(SuccessDialogComponent, {
          width: '400px',
          panelClass: 'custom-success-dialog',
        })
        dialogRef.afterClosed().subscribe(() => this.clearHistoryStateAndGoBack())
      },
      error: err => {
        const errMsg = err?.error?.params?.errMsg || 'Failed to submit review. Please try again.'
        this.snackBar.open(errMsg, 'X', { duration: 4000 })
      },
    })
  }

  approve() {
    this.submitDecision('APPROVED')
  }

  reject() {
    this.submitDecision('REJECTED')
  }

  // Helper to normalise checkbox answer (array or comma-separated string) to string[]
  getCheckboxItems(answer: string | number): string[] {
    if (Array.isArray(answer)) return (answer as string[]).filter(Boolean)
    if (typeof answer === 'string' && answer.trim()) {
      return answer.split(',').map(s => s.trim()).filter(Boolean)
    }
    return []
  }

  // Helper for array generation for read-only rating
  getRange(n: number) {
    return Array.from({ length: n }, (_, i) => i + 1)
  }

  // Helper to format file size
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Preview document in VideoPreviewDialogComponent
  previewDocument(url: string, name?: string) {
    const resolvedName = name || this.getAttachmentName(url)
    const type = this.isPdf(url) ? 'application/pdf' : this.isVideo(url) ? 'video/mp4' : ''
    if (!type) {
      window.open(url, '_blank')
      return
    }
    this.dialog.open(VideoPreviewDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      height: this.isPdf(url) ? '90vh' : 'auto',
      data: { url, name: resolvedName, type },
    })
  }

}
