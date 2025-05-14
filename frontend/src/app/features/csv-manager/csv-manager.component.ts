import { Component, signal } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CsvTableComponent } from '../csv-table/csv-table.component';
import jsPDF from 'jspdf';

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

// Add rarity level enum
enum RarityLevel {
    COMMON = 'green',
    UNCOMMON = 'yellow',
    RARE = 'red',
    ULTRA_RARE = 'purple'
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

    private determineRarityLevel(coin: CsvData): RarityLevel {
        // Extract values, handling potential missing or invalid data
        const year = parseInt(String(coin['Year'] || '0'));
        const usdValue = parseFloat(String(coin['USD (CoinSnap)'] || '0').replace(/[^0-9.]/g, ''));
        const grading = String(coin['Grading'] || '').toUpperCase();

        // Initialize score
        let rarityScore = 0;

        // Year-based scoring (older coins are rarer)
        if (year < 1900) rarityScore += 3;
        else if (year < 1950) rarityScore += 2;
        else if (year < 2000) rarityScore += 1;

        // USD Value-based scoring (CoinSnap)
        if (usdValue > 30) rarityScore += 3;
        else if (usdValue > 20) rarityScore += 2;
        else if (usdValue > 10) rarityScore += 1;

        // Grading-based scoring
        if (grading.includes('MS') || grading.includes('PF')) {
            if (grading.includes('70') || grading.includes('69')) rarityScore += 3;
            else if (grading.includes('68') || grading.includes('67')) rarityScore += 2;
            else if (grading.includes('66') || grading.includes('65')) rarityScore += 1;
        }

        // Determine rarity level based on total score
        if (rarityScore >= 6) return RarityLevel.ULTRA_RARE;
        if (rarityScore >= 4) return RarityLevel.RARE;
        if (rarityScore >= 2) return RarityLevel.UNCOMMON;
        return RarityLevel.COMMON;
    }

    generatePDF() {
        // Only include selected coins
        const selected = this.selectedCsvData.filter(row => row['selected'] === true);
        const doc = new jsPDF({ unit: 'in', format: 'letter' }); // 8.5 x 11 inches
        const cardSize = 1.6; // 1.6 inches
        const margin = 0.3; // 0.3 inch margin between cards for easier cutting
        const bleed = 0.08; // 0.08 inch bleed
        const pageWidth = 8.5;
        const pageHeight = 11;
        const cardsPerRow = Math.floor((pageWidth - margin) / (cardSize + margin));
        const cardsPerCol = Math.floor((pageHeight - margin) / (cardSize + margin));
        const cardsPerPage = cardsPerRow * cardsPerCol;
        const cardsPerSet = 20; // Process 20 cards at a time
        const totalSets = Math.ceil(selected.length / cardsPerSet);

        // Helper to get bleed color by rarity
        const getBleedColor = (rarity: RarityLevel) => {
            switch (rarity) {
                case RarityLevel.COMMON: return '#4CAF50'; // Green
                case RarityLevel.UNCOMMON: return '#FFEB3B'; // Yellow
                case RarityLevel.RARE: return '#F44336'; // Red
                case RarityLevel.ULTRA_RARE: return '#9C27B0'; // Purple
                default: return '#FFFFFF';
            }
        };

        // Process each set of 20 cards (or remaining cards)
        for (let set = 0; set < totalSets; set++) {
            const startIdx = set * cardsPerSet;
            const endIdx = Math.min(startIdx + cardsPerSet, selected.length);
            const cardsInThisSet = endIdx - startIdx;
            const pagesInSet = Math.ceil(cardsInThisSet / cardsPerPage);

            // Generate front pages for this set
            for (let p = 0; p < pagesInSet; p++) {
                if (set > 0 || p > 0) doc.addPage();
                for (let rowIdx = 0; rowIdx < cardsPerCol; rowIdx++) {
                    // How many cards in this row?
                    const isLastRow = (rowIdx === cardsPerCol - 1);
                    let cardsThisRow = cardsPerRow;
                    if (isLastRow) {
                        const remaining = cardsInThisSet - p * cardsPerPage - rowIdx * cardsPerRow;
                        if (remaining < cardsPerRow) cardsThisRow = remaining;
                    }
                    // Left alignment: start at left margin
                    const xOffset = margin;
                    for (let colIdx = 0; colIdx < cardsThisRow; colIdx++) {
                        const i = rowIdx * cardsPerRow + colIdx;
                        const idx = startIdx + p * cardsPerPage + i;
                        if (idx >= endIdx) continue;
                        const x = xOffset + colIdx * (cardSize + margin);
                        const y = margin + rowIdx * (cardSize + margin);
                        // Determine rarity and get template
                        const rarity = this.determineRarityLevel(selected[idx]);
                        const templatePath = `assets/${rarity}_template.png`;
                        // Draw bleed rectangle
                        doc.setFillColor(getBleedColor(rarity));
                        doc.rect(x - bleed, y - bleed, cardSize + 2 * bleed, cardSize + 2 * bleed, 'F');
                        // Add template background
                        doc.addImage(templatePath, 'PNG', x, y, cardSize, cardSize, undefined, 'FAST');
                        // Add card content
                        doc.setFontSize(12);
                        doc.setTextColor(0, 0, 0); // Black text
                        doc.text(String(selected[idx]['Subject'] || ''), x + cardSize / 2, y + 0.5, { align: 'center' });
                        doc.setFontSize(10);
                        doc.text(String(selected[idx]['Year'] || ''), x + cardSize / 2, y + 0.9, { align: 'center' });
                        doc.setFontSize(14);
                        doc.text(`#${idx + 1}`, x + cardSize / 2, y + 1.25, { align: 'center' });
                    }
                }
            }

            // Generate back pages for this set
            for (let p = 0; p < pagesInSet; p++) {
                doc.addPage();
                for (let rowIdx = 0; rowIdx < cardsPerCol; rowIdx++) {
                    // How many cards in this row?
                    const isLastRow = (rowIdx === cardsPerCol - 1);
                    let cardsThisRow = cardsPerRow;
                    if (isLastRow) {
                        const remaining = cardsInThisSet - p * cardsPerPage - rowIdx * cardsPerRow;
                        if (remaining < cardsPerRow) cardsThisRow = remaining;
                    }
                    // Right alignment: start at right margin
                    const rowWidth = cardsThisRow * cardSize + (cardsThisRow - 1) * margin;
                    const xOffset = pageWidth - rowWidth - margin;
                    for (let colIdx = 0; colIdx < cardsThisRow; colIdx++) {
                        // Mirror the column index for the back page
                        const mirroredColIdx = cardsThisRow - 1 - colIdx;
                        const i = rowIdx * cardsPerRow + colIdx;
                        const idx = startIdx + p * cardsPerPage + i;
                        if (idx >= endIdx) continue;
                        const x = xOffset + mirroredColIdx * (cardSize + margin);
                        const y = margin + rowIdx * (cardSize + margin);
                        // Use same template as front
                        const rarity = this.determineRarityLevel(selected[idx]);
                        const templatePath = `assets/${rarity}_template.png`;
                        // Draw bleed rectangle
                        doc.setFillColor(getBleedColor(rarity));
                        doc.rect(x - bleed, y - bleed, cardSize + 2 * bleed, cardSize + 2 * bleed, 'F');
                        // Add template background
                        doc.addImage(templatePath, 'PNG', x, y, cardSize, cardSize, undefined, 'FAST');
                        // Add card content
                        doc.setFontSize(18);
                        doc.setTextColor(0, 0, 0); // Black text
                        doc.text(`#${idx + 1}`, x + cardSize / 2, y + cardSize / 2, { align: 'center', baseline: 'middle' });
                    }
                }
            }
        }
        doc.save('coin_id_cards.pdf');
    }
}
