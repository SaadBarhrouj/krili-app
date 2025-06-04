# Projet KRILI

Monorepo contenant le backend et le frontend de l'application KRILI.

## Structure du projet

- **KRILI-backend/** : API REST en Java avec Spring Boot.
- **KRILI-frontend/** : Application web en Angular avec Tailwind CSS.

## Prérequis

- Java 11 ou 17
- Maven
- Node.js (>= 14)
- npm

## Installation et exécution

### Backend

```powershell
cd KRILI-backend
./mvnw clean install
./mvnw spring-boot:run
```

L'API sera disponible sur : http://localhost:8080

### Frontend

```powershell
cd KRILI-frontend
npm install
npm run start
```

L'application sera disponible sur : http://localhost:4200

## Tests

### Backend

```powershell
cd KRILI-backend
./mvnw test
```

### Frontend

```powershell
cd KRILI-frontend
npm run test
```

## Versioning

```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin <url_du_dépôt>
git push -u origin main
```

## Technologies

- Spring Boot
- Maven
- Angular
- Tailwind CSS

## Licence


