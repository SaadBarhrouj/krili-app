import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProprietaireLayoutComponent } from './proprietaire-layout.component';

describe('ProprietaireLayoutComponent', () => {
  let component: ProprietaireLayoutComponent;
  let fixture: ComponentFixture<ProprietaireLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProprietaireLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProprietaireLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
