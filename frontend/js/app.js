/**
 * Application principale - Gestion de l'analyse de devis
 */

// Configuration
// Utiliser un chemin relatif pour profiter du reverse proxy Nginx
const API_URL = '/api';

// État de l'application
const appState = {
    dropzone1: null,
    dropzone2: null,
    isAnalyzing: false
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialise l'application
 */
function initializeApp() {
    console.log('🚀 Initialisation de l\'application...');

    // Initialiser les dropzones
    const dropzone1Element = document.getElementById('dropzone1');
    const dropzone2Element = document.getElementById('dropzone2');
    const fileInput1 = document.getElementById('fileInput1');
    const fileInput2 = document.getElementById('fileInput2');

    appState.dropzone1 = new DropZoneManager(dropzone1Element, fileInput1);
    appState.dropzone2 = new DropZoneManager(dropzone2Element, fileInput2);

    // Écouter les changements de fichiers
    dropzone1Element.addEventListener('filechange', updateAnalyzeButton);
    dropzone2Element.addEventListener('filechange', updateAnalyzeButton);

    // Bouton d'analyse
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.addEventListener('click', handleAnalyze);

    // Bouton nouvelle analyse
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    newAnalysisBtn.addEventListener('click', resetApp);

    console.log('✅ Application initialisée');
}

/**
 * Met à jour l'état du bouton d'analyse
 */
function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const hasFile1 = appState.dropzone1.hasFile();
    const hasFile2 = appState.dropzone2.hasFile();

    analyzeBtn.disabled = !(hasFile1 && hasFile2) || appState.isAnalyzing;
}

/**
 * Lance l'analyse des devis
 */
async function handleAnalyze() {
    if (appState.isAnalyzing) return;

    const file1 = appState.dropzone1.getFile();
    const file2 = appState.dropzone2.getFile();

    if (!file1 || !file2) {
        alert('Veuillez sélectionner deux fichiers');
        return;
    }

    try {
        appState.isAnalyzing = true;

        // Afficher la section de chargement
        showSection('loading');
        updateLoadingText('Envoi des fichiers...');

        // Créer le FormData
        const formData = new FormData();
        formData.append('quote1', file1);
        formData.append('quote2', file2);

        console.log('📤 Envoi des fichiers au serveur...');

        // Simuler une progression
        setTimeout(() => updateLoadingText('Extraction du contenu...'), 1000);
        setTimeout(() => updateLoadingText('Analyse avec Gemini AI...'), 2000);

        // Envoyer la requête
        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de l\'analyse');
        }

        const result = await response.json();
        console.log('✅ Analyse reçue:', result);

        // Afficher les résultats
        displayResults(result);

    } catch (error) {
        console.error('❌ Erreur:', error);
        showSection('upload');
        alert(`Erreur lors de l'analyse:\n${error.message}\n\nVérifiez que le serveur backend est démarré et accessible.`);
    } finally {
        appState.isAnalyzing = false;
        updateAnalyzeButton();
    }
}

/**
 * Affiche une section et cache les autres
 */
function showSection(sectionName) {
    const sections = {
        upload: document.getElementById('uploadSection'),
        loading: document.getElementById('loadingSection'),
        results: document.getElementById('resultsSection')
    };

    Object.keys(sections).forEach(key => {
        sections[key].style.display = key === sectionName ? 'block' : 'none';
    });
}

/**
 * Met à jour le texte de chargement
 */
function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

/**
 * Affiche les résultats de l'analyse
 */
function displayResults(result) {
    const resultsContent = document.getElementById('resultsContent');

    if (!result.success || !result.analysis) {
        resultsContent.innerHTML = `
            <div class="result-card">
                <h3>❌ Erreur</h3>
                <p>Impossible d'obtenir les résultats de l'analyse.</p>
            </div>
        `;
        showSection('results');
        return;
    }

    const data = result.analysis;

    // Sauvegarder les données pour l'export
    if (typeof saveAnalysisDataForExport === 'function') {
        saveAnalysisDataForExport(result);
    }

    // Construire le HTML des résultats
    let html = '';

    // Résumé exécutif
    if (data.resume_executif) {
        html += `
            <div class="result-card">
                <h3>📊 Résumé Exécutif</h3>
                <p>${escapeHtml(data.resume_executif)}</p>
            </div>
        `;
    }

    // Comparaison des devis
    if (data.devis_1 && data.devis_2) {
        html += `
            <div class="quote-grid">
                ${buildQuoteCard('Devis 1', data.devis_1, '1️⃣')}
                ${buildQuoteCard('Devis 2', data.devis_2, '2️⃣')}
            </div>
        `;

        // Ajouter les vérifications SIRET si disponibles
        if (result.siretVerifications) {
            if (result.siretVerifications.devis_1) {
                html += buildSiretCard('Devis 1', result.siretVerifications.devis_1);
            }
            if (result.siretVerifications.devis_2) {
                html += buildSiretCard('Devis 2', result.siretVerifications.devis_2);
            }
        }
    }

    // Analyse comparative
    if (data.comparaison) {
        html += buildComparisonCard(data.comparaison);
    }

    // Recommandation
    if (data.recommandation) {
        html += buildRecommendationCard(data.recommandation);
    }

    // Si erreur de parsing, afficher le texte brut
    if (data.erreur_parsing && data.analyse_brute) {
        html += `
            <div class="result-card">
                <h3>⚠️ Analyse Complète</h3>
                <p style="white-space: pre-wrap;">${escapeHtml(data.analyse_brute)}</p>
            </div>
        `;
    }

    resultsContent.innerHTML = html;
    showSection('results');
}

/**
 * Construit la carte d'un devis BTP
 */
function buildQuoteCard(title, quote, icon) {
    let html = `<div class="result-card">
        <h3>${icon} ${title}</h3>`;

    // Fournisseur
    if (quote.nom_fournisseur) {
        html += `<h4>🏢 Fournisseur</h4><p><strong>${escapeHtml(quote.nom_fournisseur)}</strong></p>`;
        if (quote.siret) html += `<p><small>SIRET: ${escapeHtml(quote.siret)}</small></p>`;
    }

    // Prix
    if (quote.prix_total_ht || quote.prix_total_ttc || quote.prix_total) {
        html += `<h4>💰 Prix</h4>`;
        if (quote.prix_total_ht) html += `<p>HT: <strong>${escapeHtml(quote.prix_total_ht)}</strong></p>`;
        if (quote.prix_total_ttc) html += `<p>TTC: <strong>${escapeHtml(quote.prix_total_ttc)}</strong></p>`;
        if (!quote.prix_total_ht && !quote.prix_total_ttc && quote.prix_total) {
            html += `<p><strong>${escapeHtml(quote.prix_total)}</strong></p>`;
        }
        if (quote.tva) html += `<p><small>TVA: ${escapeHtml(quote.tva)}</small></p>`;
        if (quote.ratio_prix_m2) html += `<p><small> ${escapeHtml(quote.ratio_prix_m2)}</small></p>`;
    }

    // Garanties
    if (quote.garanties) {
        if (typeof quote.garanties === 'object') {
            html += `<h4>🛡️ Garanties</h4>`;
            if (quote.garanties.decennale) html += `<p>• Décennale: ${escapeHtml(quote.garanties.decennale)}</p>`;
            if (quote.garanties.biennale) html += `<p>• Biennale: ${escapeHtml(quote.garanties.biennale)}</p>`;
            if (quote.garanties.parfait_achevement) html += `<p>• Parfait achèvement: ${escapeHtml(quote.garanties.parfait_achevement)}</p>`;
        } else {
            html += `<h4>🛡️ Garanties</h4><p>${escapeHtml(quote.garanties)}</p>`;
        }
    }

    // Assurances
    if (quote.assurances) {
        html += `<h4>🔒 Assurances</h4>`;
        if (quote.assurances.rc_pro) html += `<p>• RC Pro: ${escapeHtml(quote.assurances.rc_pro)}</p>`;
        if (quote.assurances.rc_decennale) html += `<p>• RC Décennale: ${escapeHtml(quote.assurances.rc_decennale)}</p>`;
        if (quote.assurances.dommages_ouvrage) html += `<p>• DO: ${escapeHtml(quote.assurances.dommages_ouvrage)}</p>`;
    }

    // Qualifications
    if (quote.qualifications && quote.qualifications.length > 0) {
        html += `<h4>⭐ Qualifications</h4>
            <p>${quote.qualifications.map(q => `<span class="badge">${escapeHtml(q)}</span>`).join(' ')}</p>`;
    }

    // Normes
    if (quote.normes_respectees && quote.normes_respectees.length > 0) {
        html += `<h4>📋 Normes</h4>
            <p>${quote.normes_respectees.map(n => `<span class="badge">${escapeHtml(n)}</span>`).join(' ')}</p>`;
    }

    // Délais
    if (quote.delais_execution || quote.delais) {
        html += `<h4>⏱️ Délais</h4><p>${escapeHtml(quote.delais_execution || quote.delais)}</p>`;
    }

    // Postes de travaux
    if (quote.postes && quote.postes.length > 0) {
        html += `<h4>📝 Postes de Travaux</h4>
            <div style="max-height: 300px; overflow-y: auto; margin: 10px 0;">
                <table style="width: 100%; font-size: 0.9em;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.1);">
                            <th style="padding: 5px; text-align: left;">Corps d'état</th>
                            <th style="padding: 5px; text-align: right;">Prix</th>
                        </tr>
                    </thead>
                    <tbody>`;

        quote.postes.forEach(poste => {
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 5px;">
                    <strong>${escapeHtml(poste.corps_etat || 'N/A')}</strong><br>
                    <small>${escapeHtml(poste.description || '')}</small>
                    ${poste.quantite ? `<br><small>Qté: ${escapeHtml(poste.quantite)}</small>` : ''}
                </td>
                <td style="padding: 5px; text-align: right;">
                    <strong>${escapeHtml(poste.prix_total || 'N/A')}</strong>
                    ${poste.pourcentage_total ? `<br><small>${escapeHtml(poste.pourcentage_total)}</small>` : ''}
                </td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
    }

    // Points forts
    if (quote.points_forts && quote.points_forts.length > 0) {
        html += `<h4>✅ Points Forts</h4><ul>
            ${quote.points_forts.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>`;
    }

    // Points faibles
    if (quote.points_faibles && quote.points_faibles.length > 0) {
        html += `<h4>⚠️ Points Faibles</h4><ul>
            ${quote.points_faibles.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Construit la carte de comparaison BTP
 */
function buildComparisonCard(comparaison) {
    let html = `<div class="result-card">
        <h3>⚖️ Comparaison</h3>`;

    // Différence de prix
    if (comparaison.difference_prix_ht || comparaison.difference_prix) {
        html += `<h4>💰 Différence de Prix</h4>
            <p>${escapeHtml(comparaison.difference_prix_ht || comparaison.difference_prix)}</p>`;
        if (comparaison.difference_prix_m2) {
            html += `<p><small>Au m²: ${escapeHtml(comparaison.difference_prix_m2)}</small></p>`;
        }
    }

    // Meilleur rapport qualité/prix
    if (comparaison.meilleur_rapport_qualite_prix) {
        html += `<h4>🏆 Meilleur Rapport Qualité/Prix</h4>
            <p><span class="badge badge-success">${escapeHtml(comparaison.meilleur_rapport_qualite_prix)}</span></p>`;
    }

    // Comparaison poste par poste
    if (comparaison.comparaison_postes && comparaison.comparaison_postes.length > 0) {
        html += `<h4>📊 Comparaison par Corps d'État</h4>
            <div style="max-height: 250px; overflow-y: auto; margin: 10px 0;">
                <table style="width: 100%; font-size: 0.85em;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.1);">
                            <th style="padding: 5px; text-align: left;">Corps d'état</th>
                            <th style="padding: 5px; text-align: right;">Devis 1</th>
                            <th style="padding: 5px; text-align: right;">Devis 2</th>
                            <th style="padding: 5px; text-align: right;">Écart</th>
                        </tr>
                    </thead>
                    <tbody>`;

        comparaison.comparaison_postes.forEach(poste => {
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 5px;"><small>${escapeHtml(poste.corps_etat)}</small></td>
                <td style="padding: 5px; text-align: right;"><small>${escapeHtml(poste.devis_1_prix || 'N/A')}</small></td>
                <td style="padding: 5px; text-align: right;"><small>${escapeHtml(poste.devis_2_prix || 'N/A')}</small></td>
                <td style="padding: 5px; text-align: right;"><small>${escapeHtml(poste.difference || 'N/A')}</small></td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
    }

    // Alertes de conformité
    if (comparaison.alertes_conformite && comparaison.alertes_conformite.length > 0) {
        html += `<h4>⚠️ Alertes de Conformité</h4><ul>`;
        comparaison.alertes_conformite.forEach(alerte => {
            html += `<li style="color: #ff6b6b;">${escapeHtml(alerte)}</li>`;
        });
        html += `</ul>`;
    }

    // Différences notables
    if (comparaison.differences_notables && comparaison.differences_notables.length > 0) {
        html += `<h4>📌 Différences Notables</h4><ul>
            ${comparaison.differences_notables.map(diff => `<li>${escapeHtml(diff)}</li>`).join('')}
        </ul>`;
    }

    // Éléments manquants
    if (comparaison.elements_manquants) {
        html += `<h4>❌ Éléments Manquants</h4>`;
        if (comparaison.elements_manquants.devis_1 && comparaison.elements_manquants.devis_1.length > 0) {
            html += `<p><strong>Devis 1:</strong></p><ul>
                ${comparaison.elements_manquants.devis_1.map(elem => `<li>${escapeHtml(elem)}</li>`).join('')}
            </ul>`;
        }
        if (comparaison.elements_manquants.devis_2 && comparaison.elements_manquants.devis_2.length > 0) {
            html += `<p><strong>Devis 2:</strong></p><ul>
                ${comparaison.elements_manquants.devis_2.map(elem => `<li>${escapeHtml(elem)}</li>`).join('')}
            </ul>`;
        }
    }

    html += `</div>`;
    return html;
}

/**
 * Construit la carte de recommandation BTP
 */
function buildRecommendationCard(recommandation) {
    let html = `<div class="result-card">
        <h3>💡 Recommandation</h3>`;

    // Devis recommandé
    if (recommandation.devis_recommande) {
        html += `<h4>🏆 Devis Recommandé</h4>
            <p><span class="badge badge-success">${escapeHtml(recommandation.devis_recommande)}</span></p>`;
    }

    // Scores
    if (recommandation.score_devis_1 || recommandation.score_devis_2) {
        html += `<h4>📊 Scores</h4>
            <div style="display: flex; gap: 20px; margin: 10px 0;">`;
        if (recommandation.score_devis_1) {
            html += `<div style="flex: 1;">
                <p><strong>Devis 1</strong></p>
                <p style="font-size: 1.5em; color: #4CAF50;">${escapeHtml(recommandation.score_devis_1)}</p>
            </div>`;
        }
        if (recommandation.score_devis_2) {
            html += `<div style="flex: 1;">
                <p><strong>Devis 2</strong></p>
                <p style="font-size: 1.5em; color: #4CAF50;">${escapeHtml(recommandation.score_devis_2)}</p>
            </div>`;
        }
        html += `</div>`;
    }

    // Justification
    if (recommandation.justification) {
        html += `<h4>📝 Justification</h4>
            <p>${escapeHtml(recommandation.justification)}</p>`;
    }

    // Points de négociation
    if (recommandation.points_negociation && recommandation.points_negociation.length > 0) {
        html += `<h4>💬 Points de Négociation</h4><ul>
            ${recommandation.points_negociation.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
        </ul>`;
    }

    // Points d'attention
    if (recommandation.points_attention && recommandation.points_attention.length > 0) {
        html += `<h4>⚠️ Points d'Attention</h4><ul>
            ${recommandation.points_attention.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
        </ul>`;
    }

    // Questions de clarification
    if (recommandation.questions_clarification && recommandation.questions_clarification.length > 0) {
        html += `<h4>❓ Questions à Clarifier</h4><ul>
            ${recommandation.questions_clarification.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
        </ul>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Réinitialise l'application
 */
function resetApp() {
    // Supprimer les fichiers
    appState.dropzone1.removeFile();
    appState.dropzone2.removeFile();

    // Retourner à la section upload
    showSection('upload');

    // Remettre à zéro l'état
    appState.isAnalyzing = false;
    updateAnalyzeButton();

    console.log('🔄 Application réinitialisée');
}

/**
 * Formate une date ISO en format français
 */
function formatDate(isoDate) {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Construit la carte de vérification SIRET
 */
function buildSiretCard(title, siretData) {
    if (!siretData || !siretData.valid) {
        if (!siretData) return '';
        return `<div class="result-card" style="border-left: 3px solid #ff6b6b;">
            <h3>🏢 Vérification SIRET - ${escapeHtml(title)}</h3>
            <p style="color: #ff6b6b;"><strong>❌ ${escapeHtml(siretData.error || 'SIRET non valide')}</strong></p>
            ${siretData.siret ? `<p><small>SIRET testé: ${escapeHtml(siretData.siret)}</small></p>` : ''}
        </div>`;
    }

    // Score de confiance avec couleur
    let scoreColor = '#ff6b6b';
    if (siretData.scoreConfiance >= 80) scoreColor = '#4CAF50';
    else if (siretData.scoreConfiance >= 60) scoreColor = '#FFA726';

    let html = `<div class="result-card" style="border-left: 3px solid ${scoreColor};">
        <h3>🏢 Vérification SIRET - ${escapeHtml(title)}</h3>`;

    // Nom et statut
    html += `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
        <div>
            <h4 style="margin: 0;">${escapeHtml(siretData.denomination)}</h4>
            ${siretData.sigle ? `<p style="margin: 5px 0;"><small>${escapeHtml(siretData.sigle)}</small></p>` : ''}
        </div>
        <div style="text-align: right;">
            <span class="badge ${siretData.estActif ? 'badge-success' : ''}" 
                  style="background: ${siretData.estActif ? '#4CAF50' : '#ff6b6b'};">
                ${siretData.estActif ? '✅ Actif' : '❌ Fermé'}
            </span>
            <p style="margin: 5px 0;"><small>Score: <strong style="color: ${scoreColor};">${siretData.scoreConfiance}/100</strong></small></p>
        </div>
    </div>`;

    // Informations légales
    html += `<h4>📋 Informations Légales</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
            <div>
                <small style="color: #aaa;">SIRET</small>
                <p style="margin: 2px 0;"><strong>${escapeHtml(siretData.siret)}</strong></p>
            </div>
            <div>
                <small style="color: #aaa;">SIREN</small>
                <p style="margin: 2px 0;"><strong>${escapeHtml(siretData.siren)}</strong></p>
            </div>
            ${siretData.dateCreation ? `
            <div>
                <small style="color: #aaa;">Création</small>
                <p style="margin: 2px 0;">${formatDate(siretData.dateCreation)}</p>
            </div>` : ''}
            ${siretData.trancheEffectifLibelle ? `
            <div>
                <small style="color: #aaa;">Effectif</small>
                <p style="margin: 2px 0;">${escapeHtml(siretData.trancheEffectifLibelle)}</p>
            </div>` : ''}
        </div>`;

    // Activité
    if (siretData.activitePrincipaleLibelle) {
        html += `<h4>🏗️ Activité</h4>
            <p>${escapeHtml(siretData.activitePrincipaleLibelle)}</p>
            ${siretData.activitePrincipale ? `<p><small>Code NAF: ${escapeHtml(siretData.activitePrincipale)}</small></p>` : ''}`;
    }

    // Adresse
    if (siretData.adresse) {
        html += `<h4>📍 Adresse</h4>
            <p>${escapeHtml(siretData.adresse)}</p>`;
    }

    // Catégorie juridique
    if (siretData.categorieJuridiqueLibelle) {
        html += `<h4>⚖️ Forme Juridique</h4>
            <p>${escapeHtml(siretData.categorieJuridiqueLibelle)}</p>`;
    }

    // Alertes
    if (!siretData.estActif) {
        html += `<div style="background: rgba(255,107,107,0.1); padding: 10px; border-radius: 8px; margin-top: 15px;">
            <p style="color: #ff6b6b; margin: 0;"><strong>⚠️ Attention :</strong> Cette entreprise est fermée ou radiée.</p>
            ${siretData.dateFermeture ? `<p style="margin: 5px 0 0 0;"><small>Date de fermeture: ${formatDate(siretData.dateFermeture)}</small></p>` : ''}
        </div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
