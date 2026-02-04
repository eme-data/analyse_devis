import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Configuration de l'API Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Nettoie la réponse de Gemini pour extraire le JSON valide
 * @param {string} text - Texte brut retourné par Gemini
 * @returns {string} Chaîne JSON nettoyée
 */
function cleanJson(text) {
  if (!text) return '{}';

  // 1. Enlever les marqueurs de code markdown
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');

  // 2. Trouver le premier '{' et le dernier '}'
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');

  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }

  return cleaned;
}

/**
 * Fonction helper pour retry avec backoff exponentiel
 * @param {Function} fn - Fonction async à exécuter avec retry
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @param {string} operationName - Nom de l'opération pour les logs
 * @returns {Promise} Résultat de la fonction
 */
async function retryWithBackoff(fn, maxRetries = 3, operationName = 'Gemini API call') {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} - Tentative ${attempt}/${maxRetries}`);
      const result = await fn();
      if (attempt > 1) {
        console.log(`✅ ${operationName} - Succès après ${attempt} tentative(s)`);
      }
      return result;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        console.error(`❌ ${operationName} - Échec après ${maxRetries} tentatives:`, error.message);
        throw error;
      }

      // Backoff exponentiel: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.warn(`⚠️ ${operationName} - Erreur (tentative ${attempt}/${maxRetries}): ${error.message}`);
      console.log(`⏳ Attente de ${delayMs}ms avant nouvelle tentative...`);

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}


/**
 * Analyse et compare deux devis en utilisant Gemini
 * @param {string} quote1Text - Texte du premier devis
 * @param {string} quote2Text - Texte du deuxième devis
 * @returns {Promise<Object>} Résultat de l'analyse structuré
 */
export async function analyzeQuotes(quote1Text, quote2Text) {
  try {
    // Utiliser le modèle Gemini 2.5 Flash (rapide et disponible)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prompt structuré pour l'analyse comparative de devis BTP/Construction
    const prompt = `Tu es un expert en analyse de devis de CONSTRUCTION (BTP). Tu connais parfaitement :
- Les corps d'état du bâtiment (gros œuvre, second œuvre, finitions)
- Les normes en vigueur (RE2020, DTU, etc.)
- Les garanties obligatoires (décennale, biennale, parfait achèvement)
- Les prix du marché et ratios métier

DEVIS 1:
${quote1Text}

DEVIS 2:
${quote2Text}

Fournis une analyse COMPLÈTE et STRUCTURÉE au format JSON suivant.
IMPORTANT: 
- Extrais TOUS les postes de travaux avec leurs quantités et prix unitaires
- Identifie le corps d'état pour chaque poste
- Vérifie la présence des garanties et assurances obligatoires
- Détecte les éléments manquants typiques en construction
- Calcule les ratios (€/m² si surface mentionnée)

{
  "resume_executif": "Résumé en 2-3 phrases de la comparaison des devis BTP",
  
  "devis_1": {
    "nom_fournisseur": "Nom de l'entreprise",
    "siret": "Si mentionné",
    "prix_total_ht": "Montant HT en €",
    "prix_total_ttc": "Montant TTC en €",
    "tva": "Taux de TVA appliqué",
    "surface_totale": "Surface en m² si mentionnée",
    "ratio_prix_m2": "Prix au m² calculé si possible",
    "delais_execution": "Délais en jours/semaines/mois",
    
    "garanties": {
      "decennale": "Oui/Non + détails",
      "biennale": "Oui/Non + détails",
      "parfait_achevement": "Oui/Non + détails"
    },
    
    "assurances": {
      "rc_pro": "Oui/Non + n° police si mentionné",
      "rc_decennale": "Oui/Non + n° police si mentionné",
      "dommages_ouvrage": "Oui/Non (souvent à la charge du MO)"
    },
    
    "postes": [
      {
        "numero": "Numéro du poste",
        "corps_etat": "Gros œuvre | Charpente | Couverture | Plomberie | Electricité | etc.",
        "description": "Description détaillée du poste",
        "quantite": "Quantité avec unité (m², ml, u, ff, etc.)",
        "prix_unitaire": "Prix unitaire en € si mentionné",
        "prix_total": "Prix total du poste en €",
        "pourcentage_total": "% du montant total si calculable"
      }
    ],
    
    "qualifications": ["RGE", "Qualibat", etc.],
    "normes_respectees": ["RE2020", "NF DTU", etc.],
    
    "points_forts": ["Point fort 1", "Point fort 2", ...],
    "points_faibles": ["Point faible 1", "Point faible 2", ...]
  },
  
  "devis_2": {
    /* Même structure que devis_1 */
  },
  
  "comparaison": {
    "difference_prix_ht": "Différence en € et %",
    "difference_prix_m2": "Si surfaces comparables",
    "meilleur_rapport_qualite_prix": "Devis 1 ou Devis 2",
    
    "comparaison_postes": [
      {
        "corps_etat": "Nom du corps d'état",
        "devis_1_prix": "Prix en €",
        "devis_2_prix": "Prix en €",
        "difference": "Différence en € et %",
        "analyse": "Explication de l'écart"
      }
    ],
    
    "elements_manquants": {
      "devis_1": ["Assurance DO", "Étude de sol G2", etc.],
      "devis_2": ["Garantie biennale", etc.]
    },
    
    "alertes_conformite": [
      "Absence de mention RE2020",
      "Pas de certification RGE alors que nécessaire",
      etc.
    ],
    
    "differences_notables": [
      "Différence 1",
      "Différence 2"
    ]
  },
  
  "recommandation": {
    "devis_recommande": "Devis 1 ou Devis 2",
    "justification": "Justification détaillée métier",
    "score_devis_1": "Note sur 10",
    "score_devis_2": "Note sur 10",
    
    "points_attention": [
      "Point d'attention 1",
      "Point d'attention 2"
    ],
    
    "points_negociation": [
      "Postes à négocier avec justification",
      "Éléments à clarifier"
    ],
    
    "questions_clarification": [
      "Question 1 à poser au fournisseur",
      "Question 2"
    ]
  }
}

Fournis UNIQUEMENT le JSON, sans texte additionnel avant ou après.
IMPORTANT: Même si certaines informations ne sont pas présentes dans les devis, fournis la structure complète avec des valeurs null ou "Non mentionné".`;

    // Générer l'analyse avec retry
    const result = await retryWithBackoff(
      async () => await model.generateContent(prompt),
      3,
      'Analyse 2 devis'
    );
    const response = result.response;
    const text = response.text();

    // Parser la réponse JSON
    let analysisData;
    try {
      // Nettoyer le texte pour extraire uniquement le JSON
      const cleanedText = cleanJson(text);
      analysisData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError);
      console.log('Texte brut reçu:', text);

      // Tentative de rattrapage: chercher n'importe quelle structure JSON valide
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Format JSON non trouvé dans la réponse');
        }
      } catch (retryError) {
        throw parseError; // Relancer l'erreur originale si le rattrapage échoue
      }
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
 * Analyse et compare plusieurs devis (3+) en utilisant Gemini
 * @param {Array<string>} quotesTexts - Tableau de textes de devis
 * @returns {Promise<Object>} Résultat de l'analyse structuré
 */
export async function analyzeMultipleQuotes(quotesTexts) {
  try {
    if (!quotesTexts || quotesTexts.length < 2) {
      throw new Error('Au moins 2 devis requis pour l\'analyse');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Construire le prompt pour N devis
    let quotesSection = '';
    quotesTexts.forEach((text, index) => {
      quotesSection += `\nDEVIS ${index + 1}:\n${text}\n`;
    });

    const prompt = `Tu es un expert en analyse de devis de CONSTRUCTION (BTP). Analyse et compare ces ${quotesTexts.length} devis.

${quotesSection}

Fournis une analyse COMPLÈTE au format JSON suivant.

{
  "resume_executif": "Résumé global de la comparaison des ${quotesTexts.length} devis",
  
  "devis": [
    {
      "id": 1,
      "nom_fournisseur": "Nom de l'entreprise",
      "siret": "Si mentionné",
      "prix_total_ht": "Montant HT en €",
      "prix_total_ttc": "Montant TTC en €",
      "tva": "Taux de TVA",
      "surface_totale": "Surface en m² si mentionnée",
      "ratio_prix_m2": "Prix au m²",
      "delais_execution": "Délais",
      "garanties": {
        "decennale": "Oui/Non + détails",
        "biennale": "Oui/Non",
        "parfait_achevement": "Oui/Non"
      },
      "assurances": {
        "rc_pro": "Oui/Non",
        "rc_decennale": "Oui/Non"
      },
      "postes_travaux": [
        {
          "corps_etat": "Type de corps d'état",
          "description": "Description",
          "quantite": "Quantité",
          "prix_total": "Prix en €"
        }
      ],
      "qualifications": ["RGE", "Qualibat", etc.],
      "points_forts": ["Point fort 1", etc.],
      "points_faibles": ["Point faible 1", etc.]
    }
    /* Répéter pour chaque devis */
  ],
  
  "comparaison": {
    "prix_ranges": {
      "min_ht": "Prix HT minimum avec ID devis",
      "max_ht": "Prix HT maximum avec ID devis",
      "ecart_total": "Écart entre min et max en € et %"
    },
    
    "classement_prix": [
      {"id": 1, "prix_ht": "...", "position": 1},
      {"id": 2, "prix_ht": "...", "position": 2}
    ],
    
    "matrice_comparaison": [
      {
        "corps_etat": "Gros œuvre",
        "devis": [
          {"id": 1, "prix": "5000€"},
          {"id": 2, "prix": "4800€"}
        ],
        "analyse": "Analyse de cet écart"
      }
    ],
    
    "meilleur_rapport_qualite_prix": "ID du devis",
    "alertes_conformite": ["Alerte 1", etc.],
    "points_attention_communs": ["Point 1", etc.]
  },
  
  "recommandation": {
    "devis_recommande": "ID du devis recommandé",
    "justification": "Justification détaillée",
    "classement_global": [
      {
        "id": 1,
        "position": 1,
        "score": "8.5/10",
        "raisons": ["Raison 1", "Raison 2"]
      }
    ],
    "points_negociation": ["Point à négocier", etc.],
    "questions_clarification": ["Question 1", etc.]
  }
}

Fournis UNIQUEMENT le JSON.`;

    const result = await retryWithBackoff(
      async () => await model.generateContent(prompt),
      3,
      `Analyse ${quotesTexts.length} devis`
    );
    const response = result.response;
    const text = response.text();

    // Parser la réponse
    let analysisData;
    try {
      const cleanedText = cleanJson(text);
      analysisData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      console.log('Texte brut reçu:', text);

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Format JSON non trouvé');
        }
      } catch (retryError) {
        analysisData = {
          resume_executif: "Analyse complétée mais format non structuré",
          analyse_brute: text,
          erreur_parsing: true
        };
      }
    }

    return {
      success: true,
      data: analysisData,
      usage: result.response.usageMetadata || {}
    };

  } catch (error) {
    console.error('Erreur analyse Gemini multi-devis:', error);
    throw new Error(`Erreur d'analyse: ${error.message}`);
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Test');

    return true;
  } catch (error) {
    console.error('Configuration Gemini invalide:', error.message);
    return false;
  }
}
