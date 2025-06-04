package com.saadbarhrouj.krili.service;

import org.springframework.beans.factory.annotation.Value; // Pour lire application.properties
import org.springframework.stereotype.Service; // Pour déclarer comme service Spring
import org.springframework.web.multipart.MultipartFile; // Type de fichier reçu
import org.springframework.util.StringUtils; // Utilitaires pour les noms de fichiers
import jakarta.annotation.PostConstruct; // Pour exécuter après création du bean

import java.io.IOException; // Pour gérer les erreurs de fichiers
import java.io.InputStream;
import java.nio.file.*; // API moderne pour les fichiers
import java.util.ArrayList;
import java.util.List;
import java.util.UUID; // Pour générer des noms de fichiers uniques

@Service // Dit à Spring que c'est un bean à gérer
public class ImageStorageServiceImpl implements ImageStorageService {


    @Value("${krili.image.storage.path:/tmp/krili-images}")
    private String storagePathString;

    // Représente le chemin absolu et normalisé du dossier de stockage.
    private Path storageDirectory;

    @PostConstruct // Exécuté automatiquement après l'injection des dépendances
    public void init() throws IOException {
        // Convertit le chemin string (potentiellement relatif) en chemin absolu
        this.storageDirectory = Paths.get(storagePathString).toAbsolutePath().normalize();
        System.out.println("ImageStorageService: Tentative d'initialisation du dossier: " + this.storageDirectory);

        try {
            // Crée le dossier (et les dossiers parents si nécessaire)
            Files.createDirectories(this.storageDirectory);
            System.out.println("ImageStorageService: Dossier de stockage prêt.");
        } catch (FileAlreadyExistsException e) {
            // Ce n'est pas une erreur si le dossier existe déjà
            System.out.println("ImageStorageService: Le dossier de stockage existe déjà.");
        } catch (IOException e) {
            // Erreur grave si on ne peut pas créer le dossier (permissions, etc.)
            System.err.println("ImageStorageService: ERREUR CRITIQUE - Impossible de créer le dossier de stockage : " + this.storageDirectory);
            throw new IOException("Impossible d'initialiser le stockage d'images.", e);
        }
    }

    // --- Sauvegarde des Images ---


    @Override
    public List<String> storeImages(List<MultipartFile> files, Long annonceId) throws IOException {
        List<String> generatedFilenames = new ArrayList<>(); // Pour stocker les noms des fichiers créés

        // Vérifie si la liste de fichiers est valide
        if (files == null || files.isEmpty()) {
            System.out.println("ImageStorageService: Aucune image fournie pour la sauvegarde.");
            return generatedFilenames; // Retourne une liste vide
        }

        System.out.println("ImageStorageService: Sauvegarde de " + files.size() + " image(s)...");

        // Boucle sur chaque fichier reçu
        for (MultipartFile file : files) {
            // Ignore les éléments vides potentiels dans la liste
            if (file == null || file.isEmpty()) {
                System.out.println("ImageStorageService: Fichier vide ignoré.");
                continue;
            }

            // Étape 1 : Sécuriser et préparer le nom du fichier
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename()); // Enlève les parties potentiellement dangereuses (ex: ../)
            String fileExtension = StringUtils.getFilenameExtension(originalFilename); // Récupère l'extension (jpg, png...)
            // Crée un nom unique pour éviter d'écraser des fichiers existants
            String uniqueFilename = UUID.randomUUID().toString()
                    + (annonceId != null ? "_annonce" + annonceId : "") // Ajoute l'ID annonce si disponible
                    + "." + fileExtension; // Ajoute l'extension

            // Étape 2 : Déterminer le chemin complet de destination
            Path destinationPath = this.storageDirectory.resolve(uniqueFilename).normalize();

            // Étape 3 : Vérification de sécurité simple (évite l'écriture hors du dossier prévu)
            if (!destinationPath.startsWith(this.storageDirectory)) {
                System.err.println("ImageStorageService: ERREUR SÉCURITÉ - Tentative d'écriture hors du dossier: " + originalFilename);
                throw new IOException("Impossible de stocker le fichier en dehors du dossier autorisé : " + originalFilename);
            }

            // Étape 4 : Copier les données du fichier reçu vers le fichier de destination
            try (InputStream inputStream = file.getInputStream()) { // Ouvre le flux du fichier uploadé
                // Copie le flux vers le chemin de destination. Remplace s'il existe (peu probable avec UUID).
                Files.copy(inputStream, destinationPath, StandardCopyOption.REPLACE_EXISTING);
                generatedFilenames.add(uniqueFilename); // Ajoute le nom unique à la liste des succès
                System.out.println("ImageStorageService: Image sauvegardée sous : " + uniqueFilename);
            } catch (IOException e) {
                // Si une erreur survient pendant la copie (disque plein, permissions...)
                System.err.println("ImageStorageService: ERREUR IO lors de la sauvegarde de " + originalFilename + " sous " + uniqueFilename + ": " + e.getMessage());
                // On pourrait implémenter une logique pour supprimer les fichiers déjà créés dans cette boucle
                // pour être transactionnel au niveau des fichiers.
                // Pour l'instant, on propage l'erreur.
                throw new IOException("Erreur lors de la sauvegarde de l'image " + originalFilename, e);
            }
        }

        // Retourne la liste des noms uniques des fichiers qui ont été sauvegardés
        return generatedFilenames;
    }


    @Override
    public byte[] getImage(String imageId) throws IOException {
        // Vérifications de sécurité basiques sur l'ID demandé
        if (imageId == null || imageId.isBlank() || imageId.contains("..") || imageId.contains("/") || imageId.contains("\\")) {
            System.err.println("ImageStorageService: Tentative d'accès à une image avec ID invalide : " + imageId);
            throw new IOException("ID d'image invalide : " + imageId);
        }

        try {
            // Construit le chemin complet vers le fichier demandé
            Path filePath = this.storageDirectory.resolve(imageId).normalize();
            System.out.println("ImageStorageService: Tentative de lecture de : " + filePath);

            // Vérifie si le fichier existe et est lisible
            if (!Files.exists(filePath)) {
                System.err.println("ImageStorageService: Image non trouvée : " + filePath);
                throw new NoSuchFileException("Image non trouvée : " + imageId); // Exception plus spécifique
            }
            if (!Files.isReadable(filePath)) {
                System.err.println("ImageStorageService: Image non lisible (permissions?) : " + filePath);
                throw new IOException("Image non lisible : " + imageId);
            }

            // Vérification de sécurité : s'assurer qu'on ne lit pas en dehors du dossier prévu
            if (!filePath.startsWith(this.storageDirectory)) {
                System.err.println("ImageStorageService: ERREUR SÉCURITÉ - Tentative de lecture hors du dossier : " + imageId);
                throw new IOException("Tentative d'accès à une image non autorisée.");
            }

            // Lit tous les bytes du fichier et les retourne
            return Files.readAllBytes(filePath);

        } catch (InvalidPathException ex) {
            // Si l'imageId contient des caractères invalides pour un chemin
            System.err.println("ImageStorageService: Chemin d'image invalide : " + imageId);
            throw new IOException("Chemin d'image invalide : " + imageId, ex);
        } catch (IOException e) {
            // Autres erreurs d'entrée/sortie
            System.err.println("ImageStorageService: Erreur IO lors de la lecture de " + imageId + ": " + e.getMessage());
            throw new IOException("Impossible de lire l'image : " + imageId, e);
        }
    }

}