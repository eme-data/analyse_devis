import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { processBothQuotes, cleanupFiles, isValidFileType, isValidFileSize } from '../services/fileProcessor.js';
import { analyzeQuotes } from '../services/gemini.js';
import { verifySiret } from '../services/siretVerifier.js';
import fs from 'fs';

const router = express.Router();

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du dossier uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration de Multer pour l'upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB max
    },
    fileFilter: (req, file, cb) => {
        // Validation du type de fichier
        if (!isValidFileType(file)) {
            return cb(new Error(`Type de fichier non supporté: ${file.mimetype}. Utilisez PDF, JPG, PNG ou TXT.`));
        }
        cb(null, true);
    }
});

/**
 * POST /api/analyze
 * Endpoint principal pour analyser deux devis
 */
router.post('/analyze', upload.fields([
    { name: 'quote1', maxCount: 1 },
    { name: 'quote2', maxCount: 1 }
]), async (req, res) => {
    let uploadedFiles = [];

    try {
        console.log('📥 Nouvelle demande d\'analyse reçue');

        // Vérifier que les deux fichiers sont bien présents
        if (!req.files || !req.files.quote1 || !req.files.quote2) {
            return res.status(400).json({
                error: true,
                message: 'Deux fichiers sont requis (quote1 et quote2)'
            });
        }

        const file1 = req.files.quote1[0];
        const file2 = req.files.quote2[0];
        uploadedFiles = [file1, file2];

        console.log(`   Devis 1: ${file1.originalname}`);
        console.log(`   Devis 2: ${file2.originalname}`);

        // Validation supplémentaire des tailles
        if (!isValidFileSize(file1) || !isValidFileSize(file2)) {
            return res.status(400).json({
                error: true,
                message: 'Les fichiers ne doivent pas dépasser 10 MB'
            });
        }

        // Étape 1: Traiter les fichiers et extraire le texte
        console.log('🔍 Extraction du texte des devis...');
        const { quote1, quote2 } = await processBothQuotes(file1, file2);

        // Étape 2: Analyser avec Gemini
        console.log('🤖 Analyse avec Gemini...');
        const analysisResult = await analyzeQuotes(quote1.text, quote2.text);

        // Étape 3: Vérifier les SIRET si présents
        console.log('🔍 Vérification des informations SIRET...');
        const siretVerifications = {
            devis_1: null,
            devis_2: null
        };

        if (analysisResult.data.devis_1?.siret) {
            console.log(`   Vérification SIRET Devis 1: ${analysisResult.data.devis_1.siret}`);
            siretVerifications.devis_1 = await verifySiret(analysisResult.data.devis_1.siret);
        }

        if (analysisResult.data.devis_2?.siret) {
            console.log(`   Vérification SIRET Devis 2: ${analysisResult.data.devis_2.siret}`);
            siretVerifications.devis_2 = await verifySiret(analysisResult.data.devis_2.siret);
        }

        // Étape 4: Nettoyer les fichiers temporaires
        await cleanupFiles(uploadedFiles);

        // Étape 5: Retourner les résultats
        console.log('✅ Analyse terminée avec succès');

        res.json({
            success: true,
            message: 'Analyse complétée avec succès',
            files: {
                quote1: {
                    name: quote1.fileName,
                    size: quote1.size,
                    textLength: quote1.textLength
                },
                quote2: {
                    name: quote2.fileName,
                    size: quote2.size,
                    textLength: quote2.textLength
                }
            },
            analysis: analysisResult.data,
            siretVerifications: siretVerifications,
            usage: analysisResult.usage
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);

        // Nettoyer les fichiers en cas d'erreur
        if (uploadedFiles.length > 0) {
            await cleanupFiles(uploadedFiles);
        }

        // Retourner une erreur appropriée
        res.status(500).json({
            error: true,
            message: error.message || 'Erreur lors de l\'analyse des devis',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * GET /api/status
 * Vérifier le statut de l'API
 */
router.get('/status', (req, res) => {
    res.json({
        status: 'operational',
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
        timestamp: new Date().toISOString()
    });
});

export default router;
