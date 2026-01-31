/**
 * Module de visualisation - Graphiques pour l'analyse BTP
 */

/**
 * Crée un graphique de répartition des coûts par corps d'état
 */
function createTradeBreakdownChart(canvasId, devisData, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas ${canvasId} not found`);
        return null;
    }

    // Extraire les données des postes de travaux
    const tradeData = {};

    // Vérifier postes_travaux OU postes (compatibilité Gemini)
    const postes = devisData.postes_travaux || devisData.postes;

    console.log('📊 Debug Chart Data:', {
        devisData,
        postes_travaux: devisData.postes_travaux,
        postes: devisData.postes,
        selectedPostes: postes
    });

    if (postes && postes.length > 0) {
        postes.forEach(poste => {
            const trade = poste.corps_etat || 'Non spécifié';
            const price = parseFloat(poste.prix_total?.replace(/[^\d.-]/g, '')) || 0;

            console.log('  - Poste:', trade, 'Prix:', price);

            if (!tradeData[trade]) {
                tradeData[trade] = 0;
            }
            tradeData[trade] += price;
        });
    } else if (devisData.prix_total_ht) {
        // Si pas de détail, afficher juste le total
        const totalPrice = parseFloat(devisData.prix_total_ht.replace(/[^\d.-]/g, '')) || 0;
        console.log('  - Pas de postes détaillés, utilisation total HT:', totalPrice);
        tradeData['Total'] = totalPrice;
    }

    console.log('📊 Trade Data final:', tradeData);

    const trades = Object.keys(tradeData);
    const values = Object.values(tradeData);

    // Couleurs pour chaque corps d'état
    const colors = [
        '#4CAF50', // Vert
        '#2196F3', // Bleu
        '#FF9800', // Orange
        '#9C27B0', // Violet
        '#F44336', // Rouge
        '#00BCD4', // Cyan
        '#FFEB3B', // Jaune
        '#795548', // Marron
        '#607D8B', // Gris-bleu
        '#E91E63'  // Rose
    ];

    const ctx = canvas.getContext('2d');

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: trades,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, trades.length),
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: title,
                    color: '#ffffff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Crée un graphique de comparaison des prix par corps d'état
 */
function createPriceComparisonChart(canvasId, comparaisonData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas ${canvasId} not found`);
        return null;
    }

    if (!comparaisonData.comparaison_postes || comparaisonData.comparaison_postes.length === 0) {
        return null;
    }

    const trades = [];
    const devis1Prices = [];
    const devis2Prices = [];

    comparaisonData.comparaison_postes.forEach(poste => {
        trades.push(poste.corps_etat || 'Non spécifié');
        devis1Prices.push(parseFloat(poste.prix_devis_1?.replace(/[^\d.-]/g, '')) || 0);
        devis2Prices.push(parseFloat(poste.prix_devis_2?.replace(/[^\d.-]/g, '')) || 0);
    });

    const ctx = canvas.getContext('2d');

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: trades,
            datasets: [
                {
                    label: 'Devis 1',
                    data: devis1Prices,
                    backgroundColor: 'rgba(76, 175, 80, 0.7)',
                    borderColor: '#4CAF50',
                    borderWidth: 2
                },
                {
                    label: 'Devis 2',
                    data: devis2Prices,
                    backgroundColor: 'rgba(33, 150, 243, 0.7)',
                    borderColor: '#2196F3',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Comparaison des Prix par Corps d\'État',
                    color: '#ffffff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y || 0;
                            return `${context.dataset.label}: ${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff',
                        callback: function (value) {
                            return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Détecte les anomalies de prix
 */
function detectPriceAnomalies(devis, marketRatios) {
    const anomalies = [];

    // Vérifier le ratio prix/m² si disponible
    if (devis.ratio_prix_m2 && marketRatios.prix_m2_moyen) {
        // Convertir en string si nécessaire pour éviter l'erreur "replace is not a function"
        const ratioStr = typeof devis.ratio_prix_m2 === 'string' ? devis.ratio_prix_m2 : String(devis.ratio_prix_m2);
        const ratio = parseFloat(ratioStr.replace(/[^\d.-]/g, ''));

        // Ignorer si le ratio n'est pas valide
        if (isNaN(ratio) || ratio <= 0) {
            return anomalies;
        }

        const marketAvg = marketRatios.prix_m2_moyen;
        const deviation = ((ratio - marketAvg) / marketAvg) * 100;

        if (Math.abs(deviation) > 20) {
            anomalies.push({
                type: 'ratio_m2',
                severity: Math.abs(deviation) > 40 ? 'high' : 'medium',
                message: `Prix au m² ${deviation > 0 ? 'supérieur' : 'inférieur'} de ${Math.abs(deviation).toFixed(1)}% à la moyenne du marché`,
                details: `${ratio.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/m² vs ${marketAvg.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/m² (marché)`
            });
        }
    }

    // Vérifier les postes de travaux
    if (devis.postes_travaux && devis.postes_travaux.length > 0) {
        const totalPrix = devis.postes_travaux.reduce((sum, poste) => {
            const prix = parseFloat(poste.prix_total?.replace(/[^\d.-]/g, '')) || 0;
            return sum + prix;
        }, 0);

        devis.postes_travaux.forEach(poste => {
            const prix = parseFloat(poste.prix_total?.replace(/[^\d.-]/g, '')) || 0;
            const percentage = (prix / totalPrix) * 100;

            // Alerte si un poste représente plus de 50% du total
            if (percentage > 50) {
                anomalies.push({
                    type: 'poste_dominant',
                    severity: 'medium',
                    message: `Le poste "${poste.corps_etat || poste.description}" représente ${percentage.toFixed(1)}% du total`,
                    details: `Montant: ${prix.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
                });
            }
        });
    }

    // Vérifier les garanties manquantes (analyse BTP)
    const missingWarranties = [];
    if (!devis.garanties || typeof devis.garanties !== 'object') {
        missingWarranties.push('Garanties non spécifiées');
    } else {
        if (!devis.garanties.decennale) missingWarranties.push('Garantie décennale');
        if (!devis.garanties.biennale) missingWarranties.push('Garantie biennale');
        if (!devis.garanties.parfait_achevement) missingWarranties.push('Garantie de parfait achèvement');
    }

    if (missingWarranties.length > 0) {
        anomalies.push({
            type: 'garanties_manquantes',
            severity: 'high',
            message: `Garanties obligatoires manquantes`,
            details: missingWarranties.join(', ')
        });
    }

    return anomalies;
}

/**
 * Affiche les anomalies détectées
 */
function buildAnomaliesCard(anomalies, title) {
    if (!anomalies || anomalies.length === 0) {
        return '';
    }

    let html = `<div class="result-card" style="border-left: 3px solid #FFA726;">
        <h3>⚠️ Anomalies Détectées - ${escapeHtml(title)}</h3>`;

    anomalies.forEach(anomaly => {
        const severityColor = anomaly.severity === 'high' ? '#ff6b6b' : '#FFA726';
        const severityLabel = anomaly.severity === 'high' ? 'CRITIQUE' : 'ATTENTION';

        html += `<div style="background: rgba(255,167,38,0.1); padding: 12px; border-radius: 8px; margin: 10px 0; border-left: 3px solid ${severityColor};">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <span style="background: ${severityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${severityLabel}</span>
                <strong>${escapeHtml(anomaly.message)}</strong>
            </div>
            <p style="margin: 5px 0 0 0; color: #ccc; font-size: 0.9em;">${escapeHtml(anomaly.details)}</p>
        </div>`;
    });

    html += `</div>`;
    return html;
}

// Ratios marché BTP (données indicatives - à adapter selon région/période)
const MARKET_RATIOS_BTP = {
    prix_m2_moyen: 1500, // Prix moyen HT au m² pour rénovation
    prix_m2_min: 800,
    prix_m2_max: 2500,
    marges_recommandees: {
        gros_oeuvre: 0.20,
        second_oeuvre: 0.25,
        finitions: 0.30
    }
};
