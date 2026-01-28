import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        console.log('🔍 Liste des modèles disponibles avec votre clé API:\n');

        // Méthode pour lister les modèles (si disponible)
        const models = await genAI.listModels();

        console.log('Modèles trouvés:');
        for await (const model of models) {
            console.log(`  - ${model.name}`);
            console.log(`    Méthodes supportées: ${model.supportedGenerationMethods?.join(', ')}`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la liste des modèles:', error.message);
        console.log('\nℹ️  La méthode listModels n\'est peut-être pas disponible.');
        console.log('Essayons avec les modèles communs...\n');

        // Essayer différents modèles
        const modelsToTry = [
            'gemini-pro',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'models/gemini-pro',
            'models/gemini-1.5-pro',
        ];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hello');
                console.log(`✅ ${modelName} - FONCTIONNE`);
            } catch (err) {
                console.log(`❌ ${modelName}:`);
                console.log(`   Erreur: ${err.message}`);
                if (err.status) console.log(`   Status: ${err.status}`);
                if (err.statusText) console.log(`   StatusText: ${err.statusText}`);
            }
        }
    }
}

listModels();
