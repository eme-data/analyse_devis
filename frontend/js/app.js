/**
 * Application principale - Gestion de l'analyse de devis
 */

// Configuration
const API_URL = 'http://localhost:3000/api';

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
 * Construit la carte d'un devis
 */
function buildQuoteCard(title, quote, icon) {
    return `
        <div class="result-card">
            <h3>${icon} ${title}</h3>
            
            ${quote.nom_fournisseur ? `<h4>Fournisseur</h4><p>${escapeHtml(quote.nom_fournisseur)}</p>` : ''}
            
            ${quote.prix_total ? `<h4>Prix Total</h4><p><strong>${escapeHtml(quote.prix_total)}</strong></p>` : ''}
            
            ${quote.delais ? `<h4>Délais</h4><p>${escapeHtml(quote.delais)}</p>` : ''}
            
            ${quote.garanties ? `<h4>Garanties</h4><p>${escapeHtml(quote.garanties)}</p>` : ''}
            
            ${quote.points_forts && quote.points_forts.length > 0 ? `
                <h4>✅ Points Forts</h4>
                <ul>
                    ${quote.points_forts.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${quote.points_faibles && quote.points_faibles.length > 0 ? `
                <h4>⚠️ Points Faibles</h4>
                <ul>
                    ${quote.points_faibles.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `;
}

/**
 * Construit la carte de comparaison
 */
function buildComparisonCard(comparaison) {
    return `
        <div class="result-card">
            <h3>⚖️ Comparaison</h3>
            
            ${comparaison.difference_prix ? `
                <h4>Différence de Prix</h4>
                <p>${escapeHtml(comparaison.difference_prix)}</p>
            ` : ''}
            
            ${comparaison.meilleur_rapport_qualite_prix ? `
                <h4>Meilleur Rapport Qualité/Prix</h4>
                <p><span class="badge badge-success">${escapeHtml(comparaison.meilleur_rapport_qualite_prix)}</span></p>
            ` : ''}
            
            ${comparaison.differences_notables && comparaison.differences_notables.length > 0 ? `
                <h4>Différences Notables</h4>
                <ul>
                    ${comparaison.differences_notables.map(diff => `<li>${escapeHtml(diff)}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${comparaison.elements_manquants ? `
                <h4>Éléments Manquants</h4>
                ${comparaison.elements_manquants.devis_1 && comparaison.elements_manquants.devis_1.length > 0 ? `
                    <p><strong>Devis 1:</strong></p>
                    <ul>
                        ${comparaison.elements_manquants.devis_1.map(elem => `<li>${escapeHtml(elem)}</li>`).join('')}
                    </ul>
                ` : ''}
                ${comparaison.elements_manquants.devis_2 && comparaison.elements_manquants.devis_2.length > 0 ? `
                    <p><strong>Devis 2:</strong></p>
                    <ul>
                        ${comparaison.elements_manquants.devis_2.map(elem => `<li>${escapeHtml(elem)}</li>`).join('')}
                    </ul>
                ` : ''}
            ` : ''}
        </div>
    `;
}

/**
 * Construit la carte de recommandation
 */
function buildRecommendationCard(recommandation) {
    return `
        <div class="result-card">
            <h3>💡 Recommandation</h3>
            
            ${recommandation.devis_recommande ? `
                <h4>Devis Recommandé</h4>
                <p><span class="badge badge-success">${escapeHtml(recommandation.devis_recommande)}</span></p>
            ` : ''}
            
            ${recommandation.justification ? `
                <h4>Justification</h4>
                <p>${escapeHtml(recommandation.justification)}</p>
            ` : ''}
            
            ${recommandation.points_attention && recommandation.points_attention.length > 0 ? `
                <h4>⚠️ Points d'Attention</h4>
                <ul>
                    ${recommandation.points_attention.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${recommandation.questions_clarification && recommandation.questions_clarification.length > 0 ? `
                <h4>❓ Questions à Clarifier</h4>
                <ul>
                    ${recommandation.questions_clarification.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `;
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
 * Échappe les caractères HTML pour éviter les injections XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
