import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'cad-public',
  templateUrl: './public-layout.component.html',
  imports:[RouterOutlet]
  
})
export class PublicLayoutComponent {}
