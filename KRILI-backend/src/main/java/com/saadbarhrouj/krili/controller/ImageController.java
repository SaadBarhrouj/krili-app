package com.saadbarhrouj.krili.controller;

import com.saadbarhrouj.krili.service.ImageStorageService; // <-- Service pour lire les images
import org.springframework.beans.factory.annotation.Autowired; // <-- Pour l'injection de dépendances
import org.springframework.http.HttpStatus;                    // <-- Pour les codes de statut HTTP
import org.springframework.http.MediaType;                   // <-- Pour définir le type de contenu de l'image (JPEG, PNG...)
import org.springframework.http.ResponseEntity;              // <-- Pour construire la réponse HTTP
import org.springframework.web.bind.annotation.*;             // <-- Annotations pour le contrôleur REST (@RestController, @GetMapping, @PathVariable...)
import org.springframework.web.server.ResponseStatusException; // <-- Pour renvoyer des erreurs HTTP propres (404, 500)

import java.io.IOException;         // Pour attraper les erreurs du service d'images
import java.nio.file.NoSuchFileException; // Pour attraper spécifiquement l'erreur "fichier non trouvé"

@RestController // Déclare comme contrôleur REST
@RequestMapping("/api/images") // Préfixe de route pour ce contrôleur
public class ImageController {

    @Autowired
    private ImageStorageService imageService;

    @GetMapping("/{imageId}") // Mappe les requêtes GET sur /api/images/quelquechose
    public ResponseEntity<byte[]> getImage(@PathVariable String imageId) { // @PathVariable récupère {imageId}
        System.out.println("ImageController: Requête GET reçue pour imageId: " + imageId);
        try {
            // 1. Appeler le service pour obtenir les bytes de l'image
            byte[] imageData = imageService.getImage(imageId); // Peut lever IOException ou NoSuchFileException
            System.out.println("ImageController: Données image récupérées (" + imageData.length + " bytes).");


            // 2. Déterminer le type MIME (Content-Type) basé sur l'extension (simple approche)
            MediaType contentType = determineMediaType(imageId);
            System.out.println("ImageController: ContentType déterminé : " + contentType);


            // 3. Construire et retourner la réponse HTTP 200 OK
            return ResponseEntity.ok()                // Status HTTP 200 OK
                    .contentType(contentType)       // Définit l'en-tête Content-Type
                    .body(imageData);               // Met les données de l'image dans le corps de la réponse

        } catch (NoSuchFileException e) { // Gérer spécifiquement "Fichier non trouvé"
            System.err.println("ImageController: Image non trouvée (404) pour ID: " + imageId);
            // Renvoie une erreur 404 Not Found propre au client.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image non trouvée", e);

        } catch (IOException e) { // Gérer les autres erreurs d'entrée/sortie
            System.err.println("ImageController: Erreur IO (500) pour image ID " + imageId + ": " + e.getMessage());
            e.printStackTrace(); // Log serveur
            // Renvoie une erreur 500 Internal Server Error car c'est un problème côté serveur.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lors de la lecture de l'image", e);

        } catch (Exception e) { // Gérer toute autre exception imprévue
            System.err.println("ImageController: Erreur interne inattendue (500) pour image ID " + imageId + ": " + e.getMessage());
            e.printStackTrace(); // Log serveur
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur inattendue", e);
        }
    }


    private MediaType determineMediaType(String filename) {
        if (filename != null) {
            String lowerCaseFilename = filename.toLowerCase();
            if (lowerCaseFilename.endsWith(".png")) {
                return MediaType.IMAGE_PNG;
            } else if (lowerCaseFilename.endsWith(".jpg") || lowerCaseFilename.endsWith(".jpeg")) {
                return MediaType.IMAGE_JPEG;
            } else if (lowerCaseFilename.endsWith(".gif")) {
                return MediaType.IMAGE_GIF;
            } // Ajoutez d'autres types si vous en supportez (webp, svg...)
        }
        // Retourne un type générique si l'extension n'est pas reconnue ou si le nom est null
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}