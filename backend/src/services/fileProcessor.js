import { extractText, validateExtractedText } from '../utils/extractText.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';

// Cache en mémoire pour les extractions de texte (hash -> résultat)
const extractionCache = new Map();
const CACHE_MAX_SIZE = 50; // Limite de taille du cache

/**
 * Calcule le hash MD5 d'un fichier
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<string>} Hash MD5 du fichier
 */
async function hashFile(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

/**
 * Récupère une extraction depuis le cache
 * @param {string} hash - Hash du fichier
 * @returns {Object|null} Résultat en cache ou null
 */
function getCachedExtraction(hash) {
    return extractionCache.get(hash) || null;
}

/**
 * Met en cache une extraction
 * @param {string} hash - Hash du fichier
 * @param {Object} data - Données à cacher
 */
function setCachedExtraction(hash, data) {
    // Limiter la taille du cache
    if (extractionCache.size >= CACHE_MAX_SIZE) {
        const firstKey = extractionCache.keys().next().value;
        extractionCache.delete(firstKey);
    }
    extractionCache.set(hash, data);
}

/**
 * Compresse le texte en supprimant les espaces multiples et retours à la ligne excessifs
 * @param {string} text - Texte à compresser
 * @returns {string} Texte compressé
 */
function compressText(text) {
    return text
        .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
        .replace(/\n{3,}/g, '\n\n') // Limiter les retours à la ligne multiples
        .trim();
}

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

        // Calculer le hash du fichier pour vérifier le cache
        const fileHash = await hashFile(file.path);

        // Vérifier si le fichier est déjà en cache
        const cachedResult = getCachedExtraction(fileHash);
        if (cachedResult) {
            console.log(`✅ Cache hit! Utilisation du résultat en cache pour ${file.originalname}`);
            // Mettre à jour le nom de fichier mais garder le texte en cache
            return {
                ...cachedResult,
                fileName: file.originalname,
                fromCache: true
            };
        }

        // Extraire le texte selon le type de fichier
        const text = await extractText(file.path, file.mimetype);

        // Valider le texte extrait
        validateExtractedText(text, file.originalname);

        console.log(`✅ Texte extrait: ${text.length} caractères`);

        const result = {
            success: true,
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            text: text,
            textLength: text.length,
            fileHash: fileHash,
            fromCache: false
        };

        // Mettre en cache le résultat
        setCachedExtraction(fileHash, result);

        return result;

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
 * Traite plusieurs fichiers de devis (pour support multi-devis)
 * @param {Array<Object>} files - Tableau de fichiers
 * @returns {Promise<Array<Object>>} Tableau de résultats
 */
export async function processMultipleQuotes(files) {
    try {
        if (!files || files.length < 2) {
            throw new Error('Au moins 2 devis sont requis pour une analyse');
        }

        console.log(`📦 Traitement de ${files.length} devis en parallèle...`);

        // Traiter tous les fichiers en parallèle
        const results = await Promise.all(
            files.map(file => processFile(file))
        );

        // Détecter les doublons basés sur le hash
        const hashes = new Set();
        const duplicates = [];

        results.forEach((result, index) => {
            if (hashes.has(result.fileHash)) {
                duplicates.push(result.fileName);
            } else {
                hashes.add(result.fileHash);
            }
        });

        if (duplicates.length > 0) {
            console.warn(`⚠️  Fichiers doublons détectés: ${duplicates.join(', ')}`);
        }

        return results;

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
