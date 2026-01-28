/**
 * Configuration métier pour le secteur BTP/Construction
 */

export const BTP_CONFIG = {
    // Corps d'état standardisés
    corpsDEtat: [
        'Installation de chantier',
        'Terrassement / VRD',
        'Gros œuvre',
        'Charpente',
        'Couverture / Étanchéité',
        'Menuiseries extérieures',
        'Plomberie / Sanitaires',
        'Électricité',
        'Chauffage / Climatisation',
        'Ventilation',
        'Isolation',
        'Plâtrerie / Cloisons',
        'Menuiseries intérieures',
        'Peinture / Décoration',
        'Revêtements sols',
        'Carrelage / Faïence',
        'Espaces verts / VRD',
        'Nettoyage de fin de chantier',
        'Coordination / Maîtrise d\'œuvre'
    ],

    // Normes et réglementations en vigueur
    normesReference: [
        'RE2020',
        'RT 2012',
        'NF DTU',
        'BBC (Bâtiment Basse Consommation)',
        'HPE (Haute Performance Énergétique)',
        'BEPOS (Bâtiment à Énergie Positive)',
        'PMR (Accessibilité)',
        'RT Existant'
    ],

    // Qualifications et certifications
    qualifications: [
        'RGE (Reconnu Garant Environnement)',
        'Qualibat',
        'Qualifelec',
        'Qualit\'EnR',
        'Qualipac',
        'QualiPV',
        'Qualisol',
        'Qualibois',
        'Eco Artisan'
    ],

    // Garanties obligatoires
    garantiesObligatoires: [
        'Garantie décennale',
        'Garantie biennale (bon fonctionnement)',
        'Garantie de parfait achèvement (1 an)'
    ],

    // Assurances recommandées/obligatoires
    assurances: [
        'RC Professionnelle',
        'RC Décennale',
        'Dommages-Ouvrage (obligatoire pour le maître d\'ouvrage)',
        'All risks chantier',
        'TRC (Tous Risques Chantier)'
    ],

    // Éléments souvent oubliés dans les devis
    elementsAVerifier: [
        'Assurance dommages-ouvrage',
        'Étude de sol G2',
        'Contrôle technique',
        'Coordonnateur SPS (sécurité)',
        'Diagnostics obligatoires',
        'Raccordements réseaux',
        'Frais de voirie',
        'Réception de chantier',
        'Levée de réserves'
    ],

    // Ratios d'alerte pour détection d'anomalies
    ratiosAlertes: {
        // Prix au m² (construction neuve)
        prixM2Neuf: {
            min: 1200,
            max: 2500,
            unite: '€/m² HT'
        },
        // Prix au m² (rénovation)
        prixM2Renovation: {
            min: 800,
            max: 2000,
            unite: '€/m² HT'
        },
        // Taux de maîtrise d'œuvre
        tauxMOE: {
            min: 7,
            max: 15,
            unite: '% du montant HT'
        },
        // Marge bénéficiaire attendue
        margeBeneficiaire: {
            min: 10,
            max: 25,
            unite: '%'
        },
        // Répartition typique par poste (construction neuve)
        repartitionTypique: {
            'Gros œuvre': { min: 25, max: 35 },
            'Second œuvre': { min: 40, max: 50 },
            'Finitions': { min: 15, max: 25 },
            'VRD': { min: 5, max: 10 }
        }
    },

    // Unités courantes en construction
    unitesCourantes: [
        'm² (mètre carré)',
        'm³ (mètre cube)',
        'ml (mètre linéaire)',
        'u (unité)',
        'ens (ensemble)',
        'ff (forfait)',
        'h (heure)',
        'j (jour)',
        't (tonne)'
    ]
};

export default BTP_CONFIG;
