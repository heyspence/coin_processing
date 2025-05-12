import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'csv-table',
    templateUrl: './csv-table.component.html',
    styleUrls: ['./csv-table.component.css'],
    standalone: true,
    imports: [CommonModule, FormsModule]
})
export class CsvTableComponent implements OnChanges {
    @Input() csvData: any[] = [];
    @Input() headers: string[] = [];
    @Input() allSelected: boolean = false;
    @Output() rowSelectionChange = new EventEmitter<{row: any, index: number}>();
    @Output() selectAllChange = new EventEmitter<boolean>();

    ngOnChanges(changes: SimpleChanges) {
        if (changes['csvData'] && this.csvData.length > 0) {
            // Extract headers from the first row if not provided
            if (this.headers.length === 0) {
                this.headers = Object.keys(this.csvData[0]);
            }
            // Ensure all rows have a selected property initialized to false
            this.csvData.forEach(row => {
                if (row['selected'] === undefined) {
                    row['selected'] = false;
                }
            });
        }
    }

    toggleSelectAll(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        // Update all rows immediately for responsive UI
        this.csvData.forEach(row => {
            row['selected'] = checked;
        });
        this.selectAllChange.emit(checked);
    }

    onRowCheckboxModelChange(checked: boolean, row: any, index: number) {
        row['selected'] = checked;
        this.rowSelectionChange.emit({row, index});
    }
} 