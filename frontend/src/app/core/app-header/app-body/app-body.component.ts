import { Component } from "@angular/core";
import { UploadComponentComponent } from "../../../features/upload-component/upload-component.component";
@Component({
    selector: 'app-body',
    templateUrl: './app-body.component.html',
    styleUrls: ['./app-body.component.css'],
    imports: [UploadComponentComponent],
    standalone: true,
})

export class AppBodyComponent { 
    title = 'Coin Processor';
}
