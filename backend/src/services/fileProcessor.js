import { extractText, validateExtractedText } from '../utils/extractText.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/**
 * Traite un fichier uploadé et extrait son contenu
 * @param {Object} file - Objet fichier Multer
 * @returns {Promise<Object>} Objet contenant le texte extrait et les métadonnées
 */
export async function processFile(file) {
    try {
        if (!file) {
            throw new Error('Aucun fichier fourni');
        }

        console.log(`📄 Traitement du fichier: ${file.originalname}`);
        console.log(`   Type: ${file.mimetype}`);
        console.log(`   Taille: ${(file.size / 1024).toFixed(2)} KB`);

        // Extraire le texte selon le type de fichier
        const text = await extractText(file.path, file.mimetype);

        // Valider le texte extrait
        validateExtractedText(text, file.originalname);

        console.log(`✅ Texte extrait: ${text.length} caractères`);

        return {
            success: true,
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            text: text,
            textLength: text.length
        };

    } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${file?.originalname}:`, error);
        throw new Error(`Erreur de traitement du fichier ${file?.originalname}: ${error.message}`);
    }
}

/**
 * Traite deux fichiers de devis
 * @param {Object} file1 - Premier fichier
 * @param {Object} file2 - Deuxième fichier
 * @returns {Promise<Object>} Objets avec les textes extraits
 */
export async function processBothQuotes(file1, file2) {
    try {
        // Traiter les deux fichiers en parallèle pour plus de rapidité
        const [result1, result2] = await Promise.all([
            processFile(file1),
            processFile(file2)
        ]);

        return {
            quote1: result1,
            quote2: result2
        };

    } catch (error) {
        throw error;
    }
}

/**
 * Nettoie les fichiers temporaires uploadés
 * @param {Array<Object>} files - Liste des fichiers à supprimer
 */
export async function cleanupFiles(files) {
    if (!files || files.length === 0) {
        return;
    }

    for (const file of files) {
        try {
            if (file && file.path && fsSync.existsSync(file.path)) {
                await fs.unlink(file.path);
                console.log(`🗑️  Fichier temporaire supprimé: ${file.originalname}`);
            }
        } catch (error) {
            console.error(`⚠️  Impossible de supprimer ${file?.path}:`, error.message);
        }
    }
}

/**
 * Valide les types de fichiers acceptés
 * @param {Object} file - Fichier à valider
 * @returns {boolean} True si le type est accepté
 */
export function isValidFileType(file) {
    const acceptedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'text/plain'
    ];

    return acceptedTypes.includes(file.mimetype);
}

/**
 * Valide la taille des fichiers
 * @param {Object} file - Fichier à valider
 * @param {number} maxSize - Taille maximale en octets (défaut: 10MB)
 * @returns {boolean} True si la taille est acceptable
 */
export function isValidFileSize(file, maxSize = 10 * 1024 * 1024) {
    return file.size <= maxSize;
}
