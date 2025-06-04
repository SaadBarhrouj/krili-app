import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateLogementComponent } from './create-logement.component';

describe('CreateLogementComponent', () => {
  let component: CreateLogementComponent;
  let fixture: ComponentFixture<CreateLogementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateLogementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateLogementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
