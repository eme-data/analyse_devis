/**
 * Construit la carte de vérification SIRET
 */
function buildSiretCard(title, siretData) {
    if (!siretData.valid) {
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
 * Formate une date ISO en format français
 */
function formatDate(isoDate) {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Il faut ajouter cette fonction avant buildQuoteCard dans app.js
