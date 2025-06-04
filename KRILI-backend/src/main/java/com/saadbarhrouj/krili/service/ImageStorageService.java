package com.saadbarhrouj.krili.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
public interface ImageStorageService {

    List<String> storeImages(List<MultipartFile> files, Long annonceId) throws IOException;

    byte[] getImage(String imageId) throws IOException;

}