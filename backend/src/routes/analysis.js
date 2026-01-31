import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { processBothQuotes, processMultipleQuotes, cleanupFiles, isValidFileType, isValidFileSize } from '../services/fileProcessor.js';
import { analyzeQuotes, analyzeMultipleQuotes } from '../services/gemini.js';
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
 * POST /api/analyze-stream
 * Endpoint SSE pour analyser deux devis avec progression en temps réel
 */
router.post('/analyze-stream', upload.fields([
    { name: 'quote1', maxCount: 1 },
    { name: 'quote2', maxCount: 1 }
]), async (req, res) => {
    let uploadedFiles = [];

    try {
        console.log('📥 Nouvelle demande d\'analyse SSE reçue');

        // Configuration SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Désactiver le buffering nginx

        // Fonction helper pour envoyer la progression
        const sendProgress = (step, progress, message, estimatedTime = null) => {
            const data = {
                step,
                progress,
                message,
                estimatedTime,
                timestamp: new Date().toISOString()
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            console.log(`   📊 Progression: ${progress}% - ${message}`);
        };

        // Vérifier que les deux fichiers sont bien présents
        if (!req.files || !req.files.quote1 || !req.files.quote2) {
            sendProgress('error', 0, 'Deux fichiers sont requis');
            res.write(`data: ${JSON.stringify({ error: true, message: 'Deux fichiers sont requis' })}\n\n`);
            res.end();
            return;
        }

        const file1 = req.files.quote1[0];
        const file2 = req.files.quote2[0];
        uploadedFiles = [file1, file2];

        console.log(`   Devis 1: ${file1.originalname}`);
        console.log(`   Devis 2: ${file2.originalname}`);

        // Validation supplémentaire des tailles
        if (!isValidFileSize(file1) || !isValidFileSize(file2)) {
            sendProgress('error', 0, 'Les fichiers ne doivent pas dépasser 10 MB');
            res.write(`data: ${JSON.stringify({ error: true, message: 'Les fichiers ne doivent pas dépasser 10 MB' })}\n\n`);
            await cleanupFiles(uploadedFiles);
            res.end();
            return;
        }

        // Étape 1: Traiter les fichiers et extraire le texte (0-30%)
        sendProgress('upload', 5, 'Fichiers reçus', 25);
        sendProgress('extract', 10, 'Extraction du contenu des PDF...', 20);

        const { quote1, quote2 } = await processBothQuotes(file1, file2);

        sendProgress('extract', 30, 'Contenu extrait avec succès', 15);

        // Étape 2: Analyser avec Gemini (30-80%)
        sendProgress('analyze', 35, 'Préparation de l\'analyse IA...', 15);
        sendProgress('analyze', 40, 'Analyse des devis avec Gemini AI...', 12);

        const analysisResult = await analyzeQuotes(quote1.text, quote2.text);

        sendProgress('analyze', 75, 'Analyse IA terminée', 5);

        // Étape 3: Vérifier les SIRET si présents (80-95%)
        sendProgress('verify', 80, 'Vérification des informations...', 4);

        const siretVerifications = {
            devis_1: null,
            devis_2: null
        };

        try {
            // Vérifications SIRET en parallèle
            const siretPromises = [];

            if (analysisResult.data.devis_1?.siret) {
                console.log(`   Vérification SIRET Devis 1: ${analysisResult.data.devis_1.siret}`);
                siretPromises.push(
                    verifySiret(analysisResult.data.devis_1.siret)
                        .then(result => ({ devis: 'devis_1', result }))
                );
            }

            if (analysisResult.data.devis_2?.siret) {
                console.log(`   Vérification SIRET Devis 2: ${analysisResult.data.devis_2.siret}`);
                siretPromises.push(
                    verifySiret(analysisResult.data.devis_2.siret)
                        .then(result => ({ devis: 'devis_2', result }))
                );
            }

            if (siretPromises.length > 0) {
                sendProgress('verify', 85, 'Vérification des SIRET...', 3);
                const results = await Promise.all(siretPromises);
                results.forEach(({ devis, result }) => {
                    siretVerifications[devis] = result;
                });
            }

            sendProgress('verify', 93, 'Vérifications terminées', 1);

        } catch (siretError) {
            console.error('⚠️  Erreur lors de la vérification SIRET (non bloquant):', siretError.message);
            // On continue même si la vérification SIRET échoue
        }

        // Étape 4: Nettoyer les fichiers temporaires (95-98%)
        sendProgress('cleanup', 95, 'Finalisation...', 1);
        await cleanupFiles(uploadedFiles);

        // Étape 5: Envoyer les résultats (98-100%)
        sendProgress('complete', 98, 'Préparation des résultats...', 0);

        const finalResult = {
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
        };

        sendProgress('complete', 100, 'Analyse terminée !', 0);

        // Envoyer le résultat final
        res.write(`data: ${JSON.stringify({ complete: true, result: finalResult })}\n\n`);

        console.log('✅ Analyse SSE terminée avec succès');
        res.end();

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse SSE:', error);

        // Nettoyer les fichiers en cas d'erreur
        if (uploadedFiles.length > 0) {
            await cleanupFiles(uploadedFiles);
        }

        // Envoyer l'erreur via SSE
        const errorData = {
            error: true,
            message: error.message || 'Erreur lors de l\'analyse des devis',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };

        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.end();
    }
});

/**
 * POST /api/analyze
 * Endpoint classique pour analyser deux devis (sans SSE)
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

        try {
            if (analysisResult.data.devis_1?.siret) {
                console.log(`   Vérification SIRET Devis 1: ${analysisResult.data.devis_1.siret}`);
                siretVerifications.devis_1 = await verifySiret(analysisResult.data.devis_1.siret);
            }

            if (analysisResult.data.devis_2?.siret) {
                console.log(`   Vérification SIRET Devis 2: ${analysisResult.data.devis_2.siret}`);
                siretVerifications.devis_2 = await verifySiret(analysisResult.data.devis_2.siret);
            }
        } catch (siretError) {
            console.error('⚠️  Erreur lors de la vérification SIRET (non bloquant):', siretError.message);
            // On continue même si la vérification SIRET échoue
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
 * POST /api/analyze-multi-stream
 * Endpoint SSE pour analyser plusieurs devis (3+) avec progression en temps réel
 */
router.post('/analyze-multi-stream', upload.array('quotes', 10), async (req, res) => {
    let uploadedFiles = [];

    try {
        console.log('📥 Nouvelle demande d\'analyse multi-devis SSE reçue');

        // Configuration SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const sendProgress = (step, progress, message, estimatedTime = null) => {
            const data = { step, progress, message, estimatedTime, timestamp: new Date().toISOString() };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            console.log(`   📊 Progression: ${progress}% - ${message}`);
        };

        // Vérifier qu'au moins 2 fichiers sont présents
        if (!req.files || req.files.length < 2) {
            sendProgress('error', 0, 'Au moins 2 fichiers sont requis');
            res.write(`data: ${JSON.stringify({ error: true, message: 'Au moins 2 fichiers sont requis' })}\n\n`);
            res.end();
            return;
        }

        // Limiter à 10 devis maximum
        if (req.files.length > 10) {
            sendProgress('error', 0, 'Maximum 10 devis autorisés');
            res.write(`data: ${JSON.stringify({ error: true, message: 'Maximum 10 devis autorisés' })}\n\n`);
            await cleanupFiles(req.files);
            res.end();
            return;
        }

        uploadedFiles = req.files;
        console.log(`   Nombre de devis: ${uploadedFiles.length}`);
        uploadedFiles.forEach((file, i) => {
            console.log(`   Devis ${i + 1}: ${file.originalname}`);
        });

        // Validation des tailles
        for (const file of uploadedFiles) {
            if (!isValidFileSize(file)) {
                sendProgress('error', 0, `Le fichier ${file.originalname} dépasse 10 MB`);
                res.write(`data: ${JSON.stringify({ error: true, message: `Le fichier ${file.originalname} dépasse 10 MB` })}\n\n`);
                await cleanupFiles(uploadedFiles);
                res.end();
                return;
            }
        }

        // Étape 1: Traiter les fichiers (0-30%)
        sendProgress('upload', 5, `${uploadedFiles.length} fichiers reçus`, 30);
        sendProgress('extract', 10, 'Extraction du contenu en parallèle...', 25);

        const quotesResults = await processMultipleQuotes(uploadedFiles);

        sendProgress('extract', 30, 'Contenu extrait avec succès', 20);

        // Étape 2: Analyser avec Gemini (30-80%)
        sendProgress('analyze', 35, 'Préparation de l\'analyse IA...', 18);
        sendProgress('analyze', 40, `Analyse comparative de ${uploadedFiles.length} devis...`, 15);

        const quotesTexts = quotesResults.map(q => q.text);
        const analysisResult = await analyzeMultipleQuotes(quotesTexts);

        sendProgress('analyze', 75, 'Analyse IA terminée', 8);

        // Étape 3: Vérifier les SIRET si présents (80-95%)
        sendProgress('verify', 80, 'Vérification des informations...', 5);

        const siretVerifications = {};

        try {
            const siretPromises = [];

            if (analysisResult.data.devis && Array.isArray(analysisResult.data.devis)) {
                analysisResult.data.devis.forEach((devis, index) => {
                    if (devis.siret) {
                        console.log(`   Vérification SIRET Devis ${index + 1}: ${devis.siret}`);
                        siretPromises.push(
                            verifySiret(devis.siret)
                                .then(result => ({ index, result }))
                        );
                    }
                });
            }

            if (siretPromises.length > 0) {
                sendProgress('verify', 85, 'Vérification des SIRET en parallèle...', 3);
                const results = await Promise.all(siretPromises);
                results.forEach(({ index, result }) => {
                    siretVerifications[`devis_${index + 1}`] = result;
                });
            }

            sendProgress('verify', 93, 'Vérifications terminées', 2);

        } catch (siretError) {
            console.error('⚠️  Erreur SIRET (non bloquant):', siretError.message);
        }

        // Étape 4: Finalisation (95-100%)
        sendProgress('cleanup', 95, 'Finalisation...', 1);
        await cleanupFiles(uploadedFiles);

        sendProgress('complete', 98, 'Préparation des résultats...', 0);

        const finalResult = {
            success: true,
            message: 'Analyse multi-devis complétée avec succès',
            quotesCount: uploadedFiles.length,
            files: quotesResults.map((q, i) => ({
                id: i + 1,
                name: q.fileName,
                size: q.size,
                textLength: q.textLength,
                fromCache: q.fromCache || false
            })),
            analysis: analysisResult.data,
            siretVerifications: siretVerifications,
            usage: analysisResult.usage
        };

        sendProgress('complete', 100, 'Analyse terminée !', 0);
        res.write(`data: ${JSON.stringify({ complete: true, result: finalResult })}\n\n`);

        console.log('✅ Analyse multi-devis SSE terminée avec succès');
        res.end();

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse multi-devis SSE:', error);

        if (uploadedFiles.length > 0) {
            await cleanupFiles(uploadedFiles);
        }

        const errorData = {
            error: true,
            message: error.message || 'Erreur lors de l\'analyse des devis',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };

        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.end();
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
