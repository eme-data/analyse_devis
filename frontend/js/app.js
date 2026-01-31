/**
 * Application principale - Gestion de l'analyse de devis
 */

// Configuration
// Utiliser un chemin relatif pour profiter du reverse proxy Nginx
const API_URL = '/api';

// État de l'application
const appState = {
    dropzones: [], // Array de DropZoneManagers
    isAnalyzing: false,
    nextDropzoneId: 3 // Pour les nouvelles dropzones (1 et 2 existent déjà)
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

    // Initialiser les dropzones de base
    initializeDropzone(1);
    initializeDropzone(2);

    // Bouton d'analyse
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.addEventListener('click', handleAnalyze);

    // Bouton nouvelle analyse
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    newAnalysisBtn.addEventListener('click', resetApp);

    // Bouton ajouter un devis
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    addQuoteBtn.addEventListener('click', addNewDropzone);

    // Mettre à jour le compteur initial
    updateQuotesCounter();

    console.log('✅ Application initialisée');
}

/**
 * Initialise une dropzone spécifique
 */
function initializeDropzone(id) {
    const dropzoneElement = document.getElementById(`dropzone${id}`);
    const fileInput = document.getElementById(`fileInput${id}`);

    if (!dropzoneElement || !fileInput) {
        console.error(`Dropzone ${id} introuvable`);
        return;
    }

    const manager = new DropZoneManager(dropzoneElement, fileInput);
    appState.dropzones[id] = manager;

    // Écouter les changements de fichiers
    dropzoneElement.addEventListener('filechange', () => {
        updateAnalyzeButton();
        updateQuotesCounter();
    });
}

/**
 * Ajoute une nouvelle dropzone dynamiquement
 */
function addNewDropzone() {
    const container = document.getElementById('dropzonesContainer');
    const newId = appState.nextDropzoneId;

    // Limite à 10 devis
    if (newId > 10) {
        alert('Vous ne pouvez pas ajouter plus de 10 devis');
        return;
    }

    // Créer le HTML de la nouvelle dropzone
    const dropzoneHTML = `
        <div class="dropzone" id="dropzone${newId}" data-zone="${newId}">
            <div class="dropzone-content">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M7 18C4.23858 18 2 15.7614 2 13C2 10.2386 4.23858 8 7 8C7.03002 8 7.05995 8.00033 7.08979 8.00098C7.56831 5.65897 9.62387 4 12.0721 4C14.8389 4 17.0833 6.24442 17.0833 9.01121C17.0833 9.10355 17.0808 9.19543 17.0757 9.2868C19.3299 9.67217 21 11.6428 21 14C21 16.7614 18.7614 19 16 19H7Z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round" />
                    <path d="M12 12V21M12 12L9 15M12 12L15 15" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <h3>Devis ${newId}</h3>
                <p>Glissez votre fichier ici</p>
                <span class="file-types">PDF, JPG, PNG, TXT</span>
                <button type="button" class="select-btn">Choisir un fichier</button>
                <input type="file" id="fileInput${newId}" accept=".pdf,.jpg,.jpeg,.png,.txt" hidden>
            </div>
            <div class="file-preview" style="display: none;">
                <div class="file-info">
                    <svg class="file-icon" viewBox="0 0 24 24" fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round" />
                    </svg>
                    <div class="file-details">
                        <span class="file-name"></span>
                        <span class="file-size"></span>
                    </div>
                </div>
                <button type="button" class="remove-btn">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Insérer la nouvelle dropzone
    container.insertAdjacentHTML('beforeend', dropzoneHTML);

    // Initialiser la nouvelle dropzone
    initializeDropzone(newId);

    // Incrémenter l'ID pour la prochaine
    appState.nextDropzoneId++;

    // Mettre à jour le compteur
    updateQuotesCounter();

    console.log(`✅ Dropzone ${newId} ajoutée`);
}

/**
 * Met à jour le compteur de devis
 */
function updateQuotesCounter() {
    const counter = document.getElementById('quotesCounter');
    const loadedCount = appState.dropzones.filter(dz => dz && dz.hasFile()).length;
    const totalSlots = appState.dropzones.filter(dz => dz !== undefined).length;

    if (counter) {
        counter.textContent = `${loadedCount}/${totalSlots} devis chargés`;
    }
}

/**
 * Met à jour l'état du bouton d'analyse
 */
function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadedFiles = appState.dropzones.filter(dz => dz && dz.hasFile());

    // Activer si au moins 2 fichiers chargés
    analyzeBtn.disabled = loadedFiles.length < 2 || appState.isAnalyzing;
}

/**
 * Lance l'analyse des devis avec SSE pour progression en temps réel
 */
async function handleAnalyze() {
    if (appState.isAnalyzing) return;

    // Récupérer tous les fichiers chargés
    const files = appState.dropzones
        .filter(dz => dz && dz.hasFile())
        .map(dz => dz.getFile());

    if (files.length < 2) {
        alert('Veuillez sélectionner au moins deux fichiers');
        return;
    }

    try {
        appState.isAnalyzing = true;

        // Afficher la section de chargement
        showSection('loading');
        updateProgress(0, 'Préparation des fichiers...', 25);

        console.log(`📤 Envoi de ${files.length} fichiers au serveur...`);

        // Créer le FormData
        const formData = new FormData();

        // Choisir l'endpoint en fonction du nombre de fichiers
        let endpoint;
        if (files.length === 2) {
            // Mode classique pour 2 fichiers
            formData.append('quote1', files[0]);
            formData.append('quote2', files[1]);
            endpoint = `${API_URL}/analyze-stream`;
        } else {
            // Mode multi-devis pour 3+ fichiers
            files.forEach(file => formData.append('quotes', file));
            endpoint = `${API_URL}/analyze-multi-stream`;
        }

        console.log(`🔗 Utilisation de l'endpoint: ${endpoint}`);

        // Démarrer l'upload et obtenir un session ID temporaire
        const uploadResponse = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        // On ne peut pas utiliser EventSource avec POST, donc on utilise fetch avec streaming
        const reader = uploadResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // Décoder le chunk reçu
            buffer += decoder.decode(value, { stream: true });

            // Parser les messages SSE (format: "data: {...}\n\n")
            const messages = buffer.split('\n\n');
            buffer = messages.pop(); // Garder le message incomplet dans le buffer

            for (const message of messages) {
                if (!message.trim()) continue;

                // Extraire le JSON après "data: "
                const dataMatch = message.match(/^data: (.+)$/m);
                if (!dataMatch) continue;

                try {
                    const data = JSON.parse(dataMatch[1]);

                    if (data.error) {
                        throw new Error(data.message || 'Erreur lors de l\'analyse');
                    }

                    if (data.complete) {
                        // Analyse terminée, afficher les résultats
                        console.log('✅ Analyse reçue:', data.result);
                        displayResults(data.result);
                        break;
                    }

                    // Mise à jour de la progression
                    if (data.progress !== undefined) {
                        updateProgress(
                            data.progress,
                            data.message,
                            data.estimatedTime
                        );
                    }
                } catch (parseError) {
                    console.error('Erreur de parsing SSE:', parseError);
                }
            }
        }

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
 * Met à jour la barre de progression avec pourcentage et estimation de temps
 */
function updateProgress(progress, message, estimatedTime = null) {
    // Mettre à jour le message
    updateLoadingText(message);

    // Mettre à jour la barre de progression
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressETA = document.getElementById('progressETA');

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    if (progressPercent) {
        progressPercent.textContent = `${Math.round(progress)}%`;
    }

    if (progressETA && estimatedTime !== null) {
        if (estimatedTime === 0) {
            progressETA.textContent = 'Terminé !';
        } else if (estimatedTime < 60) {
            progressETA.textContent = `~${estimatedTime}s restantes`;
        } else {
            const minutes = Math.floor(estimatedTime / 60);
            const seconds = estimatedTime % 60;
            progressETA.textContent = `~${minutes}min ${seconds}s restantes`;
        }
    } else if (progressETA) {
        progressETA.textContent = 'Calcul...';
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

    // Comparaison des devis - Support dynamique pour N devis
    const quotesData = [];
    const quoteIcons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    // Détecter les devis dans la structure de données
    if (data.devis && Array.isArray(data.devis)) {
        // Mode multi-devis (3+)
        data.devis.forEach((devis, index) => {
            quotesData.push({
                title: `Devis ${index + 1}`,
                data: devis,
                icon: quoteIcons[index] || '📄'
            });
        });
    } else if (data.devis_1 && data.devis_2) {
        // Mode classique (2 devis)
        quotesData.push({ title: 'Devis 1', data: data.devis_1, icon: '1️⃣' });
        quotesData.push({ title: 'Devis 2', data: data.devis_2, icon: '2️⃣' });
    }

    if (quotesData.length > 0) {
        html += `<div class="quote-grid">`;
        quotesData.forEach(quote => {
            html += buildQuoteCard(quote.title, quote.data, quote.icon);
        });
        html += `</div>`;

        // Ajouter les vérifications SIRET si disponibles
        if (result.siretVerifications) {
            quotesData.forEach((quote, index) => {
                const siretKey = data.devis && Array.isArray(data.devis)
                    ? `devis_${index + 1}`
                    : (index === 0 ? 'devis_1' : 'devis_2');

                if (result.siretVerifications[siretKey]) {
                    html += buildSiretCard(quote.title, result.siretVerifications[siretKey]);
                }
            });
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

    // Détection d'anomalies de prix
    if (typeof detectPriceAnomalies === 'function' && typeof MARKET_RATIOS_BTP !== 'undefined') {
        if (data.devis_1) {
            const anomalies1 = detectPriceAnomalies(data.devis_1, MARKET_RATIOS_BTP);
            if (anomalies1.length > 0) {
                html += buildAnomaliesCard(anomalies1, 'Devis 1');
            }
        }
        if (data.devis_2) {
            const anomalies2 = detectPriceAnomalies(data.devis_2, MARKET_RATIOS_BTP);
            if (anomalies2.length > 0) {
                html += buildAnomaliesCard(anomalies2, 'Devis 2');
            }
        }
    }

    // Section graphiques - Support postes OU postes_travaux
    const hasPostes1 = data.devis_1?.postes_travaux || data.devis_1?.postes;
    const hasPostes2 = data.devis_2?.postes_travaux || data.devis_2?.postes;

    if (hasPostes1 || hasPostes2 || data.comparaison?.comparaison_postes) {
        html += `<div class="result-card">
            <h3>📊 Visualisations</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-top: 20px;">`;

        // Graphique répartition Devis 1
        if (hasPostes1) {
            html += `<div style="height: 300px;">
                <canvas id="chartDevis1"></canvas>
            </div>`;
        }

        // Graphique répartition Devis 2
        if (hasPostes2) {
            html += `<div style="height: 300px;">
                <canvas id="chartDevis2"></canvas>
            </div>`;
        }

        html += `</div>`;

        // Graphique de comparaison
        if (data.comparaison?.comparaison_postes) {
            html += `<div style="height: 400px; margin-top: 20px;">
                <canvas id="chartComparison"></canvas>
            </div>`;
        }

        html += `</div>`;
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

    // Créer les graphiques après le rendu HTML
    setTimeout(() => {
        if (typeof createTradeBreakdownChart === 'function') {
            const hasPostes1 = data.devis_1?.postes_travaux || data.devis_1?.postes;
            const hasPostes2 = data.devis_2?.postes_travaux || data.devis_2?.postes;

            if (hasPostes1) {
                createTradeBreakdownChart('chartDevis1', data.devis_1, 'Répartition Devis 1');
            }
            if (hasPostes2) {
                createTradeBreakdownChart('chartDevis2', data.devis_2, 'Répartition Devis 2');
            }
        }

        if (typeof createPriceComparisonChart === 'function') {
            if (data.comparaison?.comparaison_postes) {
                createPriceComparisonChart('chartComparison', data.comparaison);
            }
        }
    }, 100);
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
    // Supprimer tous les fichiers des dropzones
    appState.dropzones.forEach((dz, index) => {
        if (dz && index >= 1 && dz.hasFile()) {
            dz.removeFile();
        }
    });

    // Supprimer les dropzones supplémentaires (garder seulement 1 et 2)
    const container = document.getElementById('dropzonesContainer');
    for (let i = 3; i < appState.nextDropzoneId; i++) {
        const dropzoneEl = document.getElementById(`dropzone${i}`);
        if (dropzoneEl) {
            dropzoneEl.remove();
        }
        delete appState.dropzones[i];
    }

    // Réinitialiser le compteur
    appState.nextDropzoneId = 3;

    // Retourner à la section upload
    showSection('upload');

    // Remettre à zéro l'état
    appState.isAnalyzing = false;
    updateAnalyzeButton();
    updateQuotesCounter();

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
