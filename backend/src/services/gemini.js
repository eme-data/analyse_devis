import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Configuration de l'API Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyse et compare deux devis en utilisant Gemini
 * @param {string} quote1Text - Texte du premier devis
 * @param {string} quote2Text - Texte du deuxième devis
 * @returns {Promise<Object>} Résultat de l'analyse structuré
 */
export async function analyzeQuotes(quote1Text, quote2Text) {
    try {
        // Utiliser le modèle Gemini 1.5 Pro
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        // Prompt structuré pour l'analyse comparative
        const prompt = `Tu es un expert en analyse de devis commerciaux. Analyse et compare ces deux devis en détail.

DEVIS 1:
${quote1Text}

DEVIS 2:
${quote2Text}

Fournis une analyse complète et structurée au format JSON suivant:
{
  "resume_executif": "Résumé en 2-3 phrases de la comparaison",
  "devis_1": {
    "nom_fournisseur": "Nom ou référence du fournisseur",
    "prix_total": "Prix total identifié",
    "points_forts": ["Point fort 1", "Point fort 2", ...],
    "points_faibles": ["Point faible 1", "Point faible 2", ...],
    "delais": "Délais de livraison/réalisation",
    "garanties": "Garanties proposées"
  },
  "devis_2": {
    "nom_fournisseur": "Nom ou référence du fournisseur",
    "prix_total": "Prix total identifié",
    "points_forts": ["Point fort 1", "Point fort 2", ...],
    "points_faibles": ["Point faible 1", "Point faible 2", ...],
    "delais": "Délais de livraison/réalisation",
    "garanties": "Garanties proposées"
  },
  "comparaison": {
    "difference_prix": "Différence de prix et pourcentage",
    "meilleur_rapport_qualite_prix": "Devis 1 ou Devis 2 avec justification",
    "differences_notables": ["Différence 1", "Différence 2", ...],
    "elements_manquants": {
      "devis_1": ["Élément manquant 1", ...],
      "devis_2": ["Élément manquant 1", ...]
    }
  },
  "recommandation": {
    "devis_recommande": "Devis 1 ou Devis 2",
    "justification": "Justification détaillée de la recommandation",
    "points_attention": ["Point d'attention 1", "Point d'attention 2", ...],
    "questions_clarification": ["Question 1", "Question 2", ...]
  }
}

Fournis UNIQUEMENT le JSON, sans texte additionnel avant ou après.`;

        // Générer l'analyse
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parser la réponse JSON
        let analysisData;
        try {
            // Nettoyer le texte pour extraire uniquement le JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Format JSON non trouvé dans la réponse');
            }
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', parseError);
            // Retourner une structure par défaut avec le texte brut
            analysisData = {
                resume_executif: "Analyse complétée mais format non structuré",
                analyse_brute: text,
                erreur_parsing: true
            };
        }

        return {
            success: true,
            data: analysisData,
            usage: result.response.usageMetadata || {}
        };

    } catch (error) {
        console.error('Erreur lors de l\'analyse Gemini:', error);

        // Gestion des erreurs spécifiques
        if (error.message?.includes('API key')) {
            throw new Error('Clé API Gemini invalide ou manquante. Vérifiez la variable GEMINI_API_KEY.');
        } else if (error.message?.includes('quota')) {
            throw new Error('Quota API Gemini dépassé. Veuillez réessayer plus tard.');
        } else if (error.message?.includes('model')) {
            throw new Error('Modèle Gemini non disponible. Vérifiez la configuration.');
        }

        throw new Error(`Erreur d'analyse Gemini: ${error.message}`);
    }
}

/**
 * Vérifie la configuration de l'API Gemini
 * @returns {Promise<boolean>} True si la configuration est valide
 */
export async function checkGeminiConfig() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return false;
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent('Test');

        return true;
    } catch (error) {
        console.error('Configuration Gemini invalide:', error.message);
        return false;
    }
}
