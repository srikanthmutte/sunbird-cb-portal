import { Component, Inject, OnDestroy } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog'
import { Subscription } from 'rxjs'
import { NSPeerValidation } from '../../models/peer-validation.model'
import { SurveyDialogComponent } from '../survey-dialog/survey-dialog.component'
import { PeerValidationService } from '../../services/peer-validation.service'

@Component({
  selector: 'ws-app-survey-popup',
  templateUrl: './survey-popup.component.html',
  styleUrls: ['./survey-popup.component.scss'],
})
export class SurveyPopupComponent implements OnDestroy {
  private surveyDialogSub?: Subscription
  private ignoreSub?: Subscription

  constructor(
    public dialogRef: MatDialogRef<SurveyPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NSPeerValidation.ISurveyPopupData,
    private dialog: MatDialog,
    private peerValidationService: PeerValidationService,
  ) { }

  ngOnDestroy() {
    this.surveyDialogSub?.unsubscribe()
    this.ignoreSub?.unsubscribe()
  }

  onYes() {
    const surveyDialogRef = this.dialog.open(SurveyDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      disableClose: true,
      data: this.data,
    })
    // Keep popup alive until survey dialog closes, then forward its result
    this.surveyDialogSub = surveyDialogRef.afterClosed().subscribe((result: NSPeerValidation.EDialogResult) => {
      this.dialogRef.close(result)
    })
  }

  onNoButton() {
    if (this.data.notificationId && this.data.createdAt) {
      this.ignoreSub = this.peerValidationService
        .markNotificationIgnored(this.data.notificationId, this.data.createdAt)
        .subscribe({
          next: () => {
            this.peerValidationService.dashboardRefresh$.next()
            this.dialogRef.close(NSPeerValidation.EDialogResult.IGNORED)
          },
          error: () => this.dialogRef.close()
        })
    } else {
      this.dialogRef.close()
    }
  }

  onNo() {
    this.dialogRef.close()
  }
}
