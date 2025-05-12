import { Component, signal } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CsvTableComponent } from '../csv-table/csv-table.component';

interface StoredFile {
    file: File;
    uploadDate: Date;
    selected: boolean;
    data?: CsvData[]; // Store parsed data per file
}

interface CsvData {
    [key: string]: string | boolean;
    selected: boolean;
}

@Component({
    selector: 'csv-manager',
    templateUrl: './csv-manager.component.html',
    styleUrls: ['./csv-manager.component.css', '../../core/app-header/app-body/app-body.component.css'],
    standalone: true,
    imports: [CommonModule, FormsModule, CsvTableComponent]
})
export class CsvManagerComponent {
    storedFiles: StoredFile[] = [];
    isUploading: boolean = false;
    headers: string[] = [];
    expectedHeaders: string[] = [];
    showTable: boolean = false;
    allSelected: boolean = false;

    get selectedCsvData(): CsvData[] {
        return this.storedFiles
            .filter(f => f.selected && f.data)
            .flatMap(f => f.data!);
    }

    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const files = Array.from(input.files);
            
            // Validate file types
            const invalidFiles = files.filter(file => !file.name.endsWith('.csv'));
            if (invalidFiles.length > 0) {
                alert('Please select only CSV files');
                input.value = ''; // Reset input
                return;
            }

            try {
                for (const file of files) {
                    const fileContent = await this.readFile(file);
                    const { headers, data } = this.parseCSV(fileContent);

                    // If this is the first file, set the expected headers
                    if (this.expectedHeaders.length === 0) {
                        this.expectedHeaders = headers;
                        this.headers = headers;
                    } else {
                        // Validate headers match
                        if (!this.areHeadersMatching(headers)) {
                            alert(`File "${file.name}" format does not match the first file. Please ensure all files have the same columns.`);
                            continue;
                        }
                    }

                    // Store the file and its parsed data
                    this.storedFiles.push({
                        file: file,
                        uploadDate: new Date(),
                        selected: false,
                        data: data
                    });
                }

                // Reset input for next upload
                input.value = '';
            } catch (error) {
                console.error('Error processing CSV files:', error);
                alert('Error processing CSV files. Please ensure they are properly formatted.');
                input.value = '';
            }
        }
    }

    private readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    private parseCSV(content: string): { headers: string[], data: CsvData[] } {
        // Use a regex-based parser for simple quoted CSVs
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return { headers: [], data: [] };
        
        const headers = this.parseCSVRow(lines[0]).filter(h => h !== 'selected'); // filter out 'selected'
        const data = lines.slice(1).map(line => {
            const values = this.parseCSVRow(line);
            const row: CsvData = {
                selected: false
            };
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            return row;
        });
        
        return { headers, data };
    }

    // Helper to parse a single CSV row with quoted fields
    private parseCSVRow(row: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                if (inQuotes && row[i + 1] === '"') {
                    current += '"';
                    i++; // skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    private areHeadersMatching(currentHeaders: string[]): boolean {
        if (currentHeaders.length !== this.expectedHeaders.length) {
            return false;
        }
        return this.expectedHeaders.every(header => currentHeaders.includes(header));
    }

    toggleFileSelection(index: number): void {
        this.storedFiles[index].selected = !this.storedFiles[index].selected;
        this.showTable = this.storedFiles.some(file => file.selected);
    }

    removeFile(index: number): void {
        this.storedFiles.splice(index, 1);
        if (this.storedFiles.length === 0) {
            this.headers = [];
            this.expectedHeaders = [];
            this.showTable = false;
        } else {
            this.showTable = this.storedFiles.some(file => file.selected);
        }
    }

    // Helper method to format date
    formatDate(date: Date): string {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    // Helper method to format file size
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Called when a row's selection changes
    onRowSelectionChange({row, index}: {row: any, index: number}) {
        this.updateAllSelected();
    }

    // Called when the select-all checkbox is toggled
    onSelectAllChange(checked: boolean) {
        this.storedFiles
            .forEach(f => f.data!.forEach(row => row['selected'] = checked));
        this.allSelected = checked;
    }

    updateAllSelected() {
        const data = this.selectedCsvData;
        this.allSelected = data.length > 0 && data.every(row => row['selected'] === true);
    }
}
