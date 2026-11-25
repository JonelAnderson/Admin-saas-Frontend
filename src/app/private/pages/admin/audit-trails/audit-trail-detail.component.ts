import { Component, Input, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuditFieldChange, AuditTrail, fieldChanges } from './audit-trail.models';

/** Detalle de una fila de auditoría: datos del cambio y, campo por campo, el valor anterior y el nuevo. */
@Component({
  selector: 'app-audit-trail-detail',
  imports: [DatePipe],
  templateUrl: './audit-trail-detail.component.html'
})
export class AuditTrailDetailComponent implements OnInit {
  @Input() row!: AuditTrail;

  fields: AuditFieldChange[] = [];
  /** En una modificación se pueden ocultar los campos que no cambiaron. */
  onlyChanged = true;

  constructor(public activeModal: NgbActiveModal) {}

  get isUpdate(): boolean {
    return this.row?.type === 'Update';
  }

  get visibleFields(): AuditFieldChange[] {
    return this.isUpdate && this.onlyChanged ? this.fields.filter((f) => f.changed) : this.fields;
  }

  ngOnInit(): void {
    this.fields = fieldChanges(this.row);
  }
}
