import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilPublicEtudiantComponent } from './profil-public-etudiant.component';

describe('ProfilPublicEtudiantComponent', () => {
  let component: ProfilPublicEtudiantComponent;
  let fixture: ComponentFixture<ProfilPublicEtudiantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilPublicEtudiantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilPublicEtudiantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
