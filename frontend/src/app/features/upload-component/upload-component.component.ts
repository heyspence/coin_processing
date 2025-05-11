import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface StoredFile {
    file: File;
    uploadDate: Date;
    selected: boolean;
}

@Component({
    selector: 'upload-component',
    templateUrl: './upload-component.component.html',
    styleUrls: ['./upload-component.component.css', '../../core/app-header/app-body/app-body.component.css'],
    standalone: true,
    imports: [CommonModule, FormsModule]
})
export class UploadComponentComponent {
    storedFiles: StoredFile[] = [];
    isUploading: boolean = false;

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            
            // Validate file type
            if (!file.name.endsWith('.csv')) {
                alert('Please select a CSV file');
                input.value = ''; // Reset input
                return;
            }

            // Store the file
            this.storedFiles.push({
                file: file,
                uploadDate: new Date(),
                selected: false
            });

            // Reset input for next upload
            input.value = '';
        }
    }

    removeFile(index: number): void {
        this.storedFiles.splice(index, 1);
    }

    toggleFileSelection(index: number): void {
        this.storedFiles[index].selected = !this.storedFiles[index].selected;
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
}
