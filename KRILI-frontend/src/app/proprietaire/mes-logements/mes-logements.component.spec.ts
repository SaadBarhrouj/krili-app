import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesLogementsComponent } from './mes-logements.component';

describe('MesLogementsComponent', () => {
  let component: MesLogementsComponent;
  let fixture: ComponentFixture<MesLogementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesLogementsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesLogementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
