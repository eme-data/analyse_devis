import axios from 'axios';

/**
 * Service de vérification SIRET via l'API Sirene de l'INSEE
 * Documentation: https://api.insee.fr/catalogue/
 */

const SIRENE_API_URL = 'https://api.insee.fr/entreprises/sirene/V3.11';

/**
 * Vérifie et récupère les informations d'une entreprise via son SIRET
 * @param {string} siret - Numéro SIRET (14 chiffres)
 * @returns {Promise<Object>} Informations de l'entreprise
 */
export async function verifySiret(siret) {
    try {
        // Nettoyer le SIRET (enlever espaces et caractères spéciaux)
        const cleanSiret = siret.replace(/\s/g, '').replace(/[^0-9]/g, '');

        if (cleanSiret.length !== 14) {
            return {
                valid: false,
                error: 'SIRET invalide (doit contenir 14 chiffres)',
                siret: cleanSiret
            };
        }

        // Appel à l'API Sirene (publique, pas de clé API nécessaire)
        const response = await axios.get(
            `${SIRENE_API_URL}/siret/${cleanSiret}`,
            {
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 5000
            }
        );

        const etablissement = response.data.etablissement;
        const uniteLegale = etablissement.uniteLegale;
        const adresse = etablissement.adresseEtablissement;
        const periodesEtablissement = etablissement.periodesEtablissement[0];

        return {
            valid: true,
            siret: cleanSiret,
            siren: etablissement.siren,

            // Informations entreprise
            denomination: uniteLegale.denominationUniteLegale ||
                `${uniteLegale.prenom1UniteLegale || ''} ${uniteLegale.nomUniteLegale || ''}`.trim() ||
                etablissement.denominationUsuelleEtablissement,

            sigle: uniteLegale.sigleUniteLegale,

            // Statut
            etat: etablissement.etatAdministratifEtablissement === 'A' ? 'Actif' : 'Fermé',
            estActif: etablissement.etatAdministratifEtablissement === 'A',

            // Dates
            dateCreation: uniteLegale.dateCreationUniteLegale,
            dateCreationEtablissement: etablissement.dateCreationEtablissement,
            dateFermeture: etablissement.dateFermeture || null,

            // Activité
            activitePrincipale: periodesEtablissement.activitePrincipaleEtablissement,
            activitePrincipaleLibelle: periodesEtablissement.activitePrincipaleLibelleEtablissement ||
                getActiviteLibelle(periodesEtablissement.activitePrincipaleEtablissement),

            // Adresse
            adresse: formatAdresse(adresse),

            // Effectif
            trancheEffectif: uniteLegale.trancheEffectifsUniteLegale,
            trancheEffectifLibelle: getTrancheEffectifLibelle(uniteLegale.trancheEffectifsUniteLegale),

            // Catégorie juridique
            categorieJuridique: uniteLegale.categorieJuridiqueUniteLegale,
            categorieJuridiqueLibelle: getCategorieJuridiqueLibelle(uniteLegale.categorieJuridiqueUniteLegale),

            // Indicateurs
            economieSociale: uniteLegale.economieSocialeSolidaireUniteLegale === 'O',

            // Score de confiance (basique)
            scoreConfiance: calculateBasicTrustScore({
                estActif: etablissement.etatAdministratifEtablissement === 'A',
                dateCreation: uniteLegale.dateCreationUniteLegale,
                trancheEffectif: uniteLegale.trancheEffectifsUniteLegale
            })
        };

    } catch (error) {
        console.error('Erreur lors de la vérification SIRET:', error.message);

        if (error.response?.status === 404) {
            return {
                valid: false,
                error: 'SIRET non trouvé dans la base Sirene',
                siret: cleanSiret
            };
        }

        if (error.response?.status === 429) {
            return {
                valid: false,
                error: 'Trop de requêtes à l\'API Sirene, réessayez dans quelques secondes',
                siret: cleanSiret
            };
        }

        return {
            valid: false,
            error: `Erreur lors de la vérification: ${error.message}`,
            siret: cleanSiret
        };
    }
}

/**
 * Formate une adresse
 */
function formatAdresse(adresse) {
    const parts = [];

    if (adresse.numeroVoieEtablissement) parts.push(adresse.numeroVoieEtablissement);
    if (adresse.indiceRepetitionEtablissement) parts.push(adresse.indiceRepetitionEtablissement);
    if (adresse.typeVoieEtablissement) parts.push(adresse.typeVoieEtablissement);
    if (adresse.libelleVoieEtablissement) parts.push(adresse.libelleVoieEtablissement);

    const rue = parts.join(' ');
    const ville = `${adresse.codePostalEtablissement} ${adresse.libelleCommuneEtablissement}`;

    return rue ? `${rue}, ${ville}` : ville;
}

/**
 * Libellé de la tranche d'effectif
 */
function getTrancheEffectifLibelle(code) {
    const tranches = {
        'NN': 'Non renseigné',
        '00': '0 salarié',
        '01': '1 ou 2 salariés',
        '02': '3 à 5 salariés',
        '03': '6 à 9 salariés',
        '11': '10 à 19 salariés',
        '12': '20 à 49 salariés',
        '21': '50 à 99 salariés',
        '22': '100 à 199 salariés',
        '31': '200 à 249 salariés',
        '32': '250 à 499 salariés',
        '41': '500 à 999 salariés',
        '42': '1 000 à 1 999 salariés',
        '51': '2 000 à 4 999 salariés',
        '52': '5 000 à 9 999 salariés',
        '53': '10 000 salariés et plus'
    };
    return tranches[code] || 'Non renseigné';
}

/**
 * Libellé de la catégorie juridique
 */
function getCategorieJuridiqueLibelle(code) {
    const categories = {
        '1000': 'Entrepreneur individuel',
        '5499': 'SA à conseil d\'administration (s.a.i.)',
        '5505': 'SA à directoire (s.a.i.)',
        '5510': 'SAS, société par actions simplifiée',
        '5599': 'SA (s.a.i.)',
        '5710': 'SAS, société par actions simplifiée à associé unique',
        '5720': 'SARL unipersonnelle',
        '5785': 'Société civile',
        '6540': 'SARL, société à responsabilité limitée',
        '9220': 'Association déclarée'
    };
    return categories[code] || `Code ${code}`;
}

/**
 * Libellé activité (codes NAF simplifiés)
 */
function getActiviteLibelle(code) {
    if (!code) return 'Non renseigné';

    // Quelques codes NAF courants en BTP
    const codesNAF = {
        '41': 'Construction de bâtiments',
        '42': 'Génie civil',
        '43': 'Travaux de construction spécialisés',
        '4311Z': 'Travaux de démolition',
        '4312A': 'Travaux de terrassement courants',
        '4321A': 'Travaux d\'installation électrique',
        '4322A': 'Travaux d\'installation d\'eau et de gaz',
        '4322B': 'Travaux d\'installation d\'équipements thermiques',
        '4331Z': 'Travaux de plâtrerie',
        '4332A': 'Travaux de menuiserie bois',
        '4333Z': 'Travaux de revêtement des sols et des murs',
        '4391A': 'Travaux de charpente',
        '4391B': 'Travaux de couverture',
        '4399C': 'Travaux de maçonnerie générale'
    };

    // Chercher d'abord le code exact
    if (codesNAF[code]) return codesNAF[code];

    // Sinon chercher par préfixe
    const prefix = code.substring(0, 2);
    if (codesNAF[prefix]) return codesNAF[prefix];

    return `Code NAF: ${code}`;
}

/**
 * Calcule un score de confiance basique (0-100)
 */
function calculateBasicTrustScore({ estActif, dateCreation, trancheEffectif }) {
    let score = 50; // Score de base

    // Entreprise active
    if (estActif) {
        score += 30;
    } else {
        return 0; // Entreprise fermée = score 0
    }

    // Ancienneté
    if (dateCreation) {
        const annees = new Date().getFullYear() - parseInt(dateCreation.substring(0, 4));
        if (annees >= 10) score += 15;
        else if (annees >= 5) score += 10;
        else if (annees >= 2) score += 5;
    }

    // Effectif
    if (trancheEffectif) {
        const effectifOrder = ['00', '01', '02', '03', '11', '12', '21', '22', '31', '32', '41', '42', '51', '52', '53'];
        const index = effectifOrder.indexOf(trancheEffectif);
        if (index >= 5) score += 5; // 20+ salariés
    }

    return Math.min(score, 100);
}

export default {
    verifySiret
};
