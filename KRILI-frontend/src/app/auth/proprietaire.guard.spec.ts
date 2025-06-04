// src/app/auth/proprietaire.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

// <<< MODIFICATION ICI : Importer depuis le bon fichier et le bon nom >>>
import { proprietaireGuard } from './proprietaire.guard';

// <<< MODIFICATION ICI (Optionnel mais propre) : Nom du describe >>>
describe('proprietaireGuard', () => {

  // <<< MODIFICATION ICI : Utiliser le bon nom de guard >>>
  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => proprietaireGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});