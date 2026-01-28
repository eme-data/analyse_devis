import fs from 'fs/promises';
import pdf from 'pdf-parse';
import path from 'path';

/**
 * Extrait le texte d'un fichier selon son type
 * @param {string} filePath - Chemin complet du fichier
 * @param {string} mimeType - Type MIME du fichier
 * @returns {Promise<string>} Texte extrait du fichier
 */
export async function extractText(filePath, mimeType) {
    try {
        // PDF
        if (mimeType === 'application/pdf') {
            return await extractFromPDF(filePath);
        }

        // Images - pour simplifier, on retourne le nom du fichier
        // Dans une version plus avancée, on pourrait utiliser OCR
        if (mimeType.startsWith('image/')) {
            return await extractFromImage(filePath);
        }

        // Fichiers texte
        if (mimeType.startsWith('text/')) {
            return await extractFromText(filePath);
        }

        throw new Error(`Type de fichier non supporté: ${mimeType}`);
    } catch (error) {
        console.error(`Erreur lors de l'extraction du texte de ${filePath}:`, error);
        throw error;
    }
}

/**
 * Extrait le texte d'un fichier PDF
 * @param {string} filePath - Chemin du fichier PDF
 * @returns {Promise<string>} Texte extrait
 */
async function extractFromPDF(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);

        if (!data.text || data.text.trim().length === 0) {
            throw new Error('Le PDF ne contient pas de texte extractible');
        }

        return data.text;
    } catch (error) {
        throw new Error(`Erreur lors de la lecture du PDF: ${error.message}`);
    }
}

/**
 * Extrait le texte d'un fichier texte
 * @param {string} filePath - Chemin du fichier texte
 * @returns {Promise<string>} Texte extrait
 */
async function extractFromText(filePath) {
    try {
        const text = await fs.readFile(filePath, 'utf-8');

        if (!text || text.trim().length === 0) {
            throw new Error('Le fichier texte est vide');
        }

        return text;
    } catch (error) {
        throw new Error(`Erreur lors de la lecture du fichier texte: ${error.message}`);
    }
}

/**
 * Extrait le texte d'une image (via Gemini Vision API)
 * @param {string} filePath - Chemin du fichier image
 * @returns {Promise<string>} Texte extrait via Gemini Vision
 */
async function extractFromImage(filePath) {
    try {
        // Pour les images, on utilise directement l'API Gemini Vision
        // qui peut analyser le contenu visuel
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Lire l'image en base64
        const imageBuffer = await fs.readFile(filePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = path.extname(filePath).toLowerCase();

        // Déterminer le type MIME
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const mimeType = mimeTypes[ext] || 'image/jpeg';

        // Utiliser Gemini Vision pour extraire le texte
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            "Extrait tout le texte visible dans cette image de devis. Fournis le texte complet, y compris les prix, les dates, les conditions, et tous les détails importants. Si c'est un devis, assure-toi d'inclure : le nom du fournisseur, les montants, les délais, et toutes les conditions."
        ]);

        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
            throw new Error('Aucun texte détecté dans l\'image');
        }

        return text;
    } catch (error) {
        throw new Error(`Erreur lors de l'analyse de l'image: ${error.message}`);
    }
}

/**
 * Valide qu'un fichier a bien du contenu extractible
 * @param {string} text - Texte extrait
 * @param {string} fileName - Nom du fichier
 * @returns {boolean} True si valide
 */
export function validateExtractedText(text, fileName) {
    if (!text || text.trim().length < 10) {
        throw new Error(`Le fichier ${fileName} ne contient pas assez de texte exploitable`);
    }
    return true;
}
