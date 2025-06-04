import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilProprietaireComponent } from './profil-proprietaire.component';

describe('ProfilProprietaireComponent', () => {
  let component: ProfilProprietaireComponent;
  let fixture: ComponentFixture<ProfilProprietaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilProprietaireComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilProprietaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
