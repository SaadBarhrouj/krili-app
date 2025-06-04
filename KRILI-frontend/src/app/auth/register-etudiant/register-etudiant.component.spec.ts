import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterEtudiantComponent } from './register-etudiant.component';

describe('RegisterEtudiantComponent', () => {
  let component: RegisterEtudiantComponent;
  let fixture: ComponentFixture<RegisterEtudiantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterEtudiantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterEtudiantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
