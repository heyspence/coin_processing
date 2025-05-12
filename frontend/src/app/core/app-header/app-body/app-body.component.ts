import { Component } from "@angular/core";
import { CsvManagerComponent } from "../../../features/csv-manager/csv-manager.component";
import { CsvTableComponent } from "../../../features/csv-table/csv-table.component";

interface CsvData {
    [key: string]: string;
}

@Component({
    selector: 'app-body',
    templateUrl: './app-body.component.html',
    styleUrls: ['./app-body.component.css'],
    imports: [CsvManagerComponent, CsvTableComponent],
    standalone: true,
})
export class AppBodyComponent {
    title = 'Coin Processor';
    csvData: CsvData[] = [];
    headers: string[] = [];
    showTable: boolean = false;

    onDataUpdate(data: { csvData: CsvData[], headers: string[], showTable: boolean }) {
        this.csvData = data.csvData;
        this.headers = data.headers;
        this.showTable = data.showTable;
    }
}
