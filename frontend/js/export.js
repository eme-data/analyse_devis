/**
 * Module d'export - Gestion des exports Excel et PDF
 */

// Variable globale pour stocker les derniers résultats d'analyse
let lastAnalysisData = null;

/**
 * Sauvegarde les données d'analyse pour l'export
 */
function saveAnalysisDataForExport(data) {
    lastAnalysisData = data;
}

/**
 * Export en Excel
 */
function exportToExcel() {
    if (!lastAnalysisData) {
        alert('Aucune analyse disponible pour l\'export');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        const analysis = lastAnalysisData.analysis;

        // Feuille 1: Résumé
        const summaryData = [['Résumé de l\'Analyse']];
        summaryData.push([]);
        if (analysis.resume_executif) {
            summaryData.push(['Résumé Exécutif', analysis.resume_executif]);
            summaryData.push([]);
        }

        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

        // Feuille 2: Devis 1
        if (analysis.devis_1) {
            const devis1Data = buildDevisSheetData('Devis 1', analysis.devis_1, lastAnalysisData.siretVerifications?.devis_1);
            const ws2 = XLSX.utils.aoa_to_sheet(devis1Data);
            XLSX.utils.book_append_sheet(wb, ws2, 'Devis 1');
        }

        // Feuille 3: Devis 2
        if (analysis.devis_2) {
            const devis2Data = buildDevisSheetData('Devis 2', analysis.devis_2, lastAnalysisData.siretVerifications?.devis_2);
            const ws3 = XLSX.utils.aoa_to_sheet(devis2Data);
            XLSX.utils.book_append_sheet(wb, ws3, 'Devis 2');
        }

        // Feuille 4: Comparaison
        if (analysis.comparaison) {
            const compData = buildComparisonSheetData(analysis.comparaison);
            const ws4 = XLSX.utils.aoa_to_sheet(compData);
            XLSX.utils.book_append_sheet(wb, ws4, 'Comparaison');
        }

        // Feuille 5: Recommandation
        if (analysis.recommandation) {
            const recoData = buildRecommendationSheetData(analysis.recommandation);
            const ws5 = XLSX.utils.aoa_to_sheet(recoData);
            XLSX.utils.book_append_sheet(wb, ws5, 'Recommandation');
        }

        // Télécharger le fichier
        const fileName = `analyse_devis_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        console.log(`✅ Export Excel créé: ${fileName}`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'export Excel:', error);
        alert('Erreur lors de l\'export Excel. Consultez la console pour plus de détails.');
    }
}

/**
 * Construit les données pour une feuille de devis
 */
function buildDevisSheetData(title, devis, siretInfo) {
    const data = [[title], []];

    // Informations fournisseur
    data.push(['FOURNISSEUR']);
    if (devis.nom_fournisseur) data.push(['Nom', devis.nom_fournisseur]);
    if (devis.siret) data.push(['SIRET', devis.siret]);
    data.push([]);

    // Informations SIRET si disponibles
    if (siretInfo && siretInfo.valid) {
        data.push(['VÉRIFICATION SIRET']);
        data.push(['Dénomination', siretInfo.denomination]);
        data.push(['Statut', siretInfo.estActif ? 'Actif' : 'Fermé']);
        data.push(['Score de confiance', `${siretInfo.scoreConfiance}/100`]);
        if (siretInfo.dateCreation) data.push(['Date de création', new Date(siretInfo.dateCreation).toLocaleDateString('fr-FR')]);
        if (siretInfo.trancheEffectifLibelle) data.push(['Effectif', siretInfo.trancheEffectifLibelle]);
        if (siretInfo.activitePrincipaleLibelle) data.push(['Activité', siretInfo.activitePrincipaleLibelle]);
        if (siretInfo.adresse) data.push(['Adresse', siretInfo.adresse]);
        data.push([]);
    }

    // Prix
    data.push(['PRIX']);
    if (devis.prix_total_ht) data.push(['Prix HT', devis.prix_total_ht]);
    if (devis.prix_total_ttc) data.push(['Prix TTC', devis.prix_total_ttc]);
    if (devis.tva) data.push(['TVA', devis.tva]);
    if (devis.ratio_prix_m2) data.push(['Prix au m²', devis.ratio_prix_m2]);
    data.push([]);

    // Garanties
    if (devis.garanties) {
        data.push(['GARANTIES']);
        if (typeof devis.garanties === 'object') {
            if (devis.garanties.decennale) data.push(['Décennale', devis.garanties.decennale]);
            if (devis.garanties.biennale) data.push(['Biennale', devis.garanties.biennale]);
            if (devis.garanties.parfait_achevement) data.push(['Parfait achèvement', devis.garanties.parfait_achevement]);
        }
        data.push([]);
    }

    // Postes de travaux
    if (devis.postes_travaux && devis.postes_travaux.length > 0) {
        data.push(['POSTES DE TRAVAUX']);
        data.push(['Corps d\'état', 'Description', 'Quantité', 'Prix unitaire', 'Prix total']);
        devis.postes_travaux.forEach(poste => {
            data.push([
                poste.corps_etat || '',
                poste.description || '',
                poste.quantite || '',
                poste.prix_unitaire || '',
                poste.prix_total || ''
            ]);
        });
        data.push([]);
    }

    return data;
}

/**
 * Construit les données pour la feuille de comparaison
 */
function buildComparisonSheetData(comp) {
    const data = [['COMPARAISON'], []];

    if (comp.difference_prix_ht || comp.difference_prix) {
        data.push(['Différence de prix', comp.difference_prix_ht || comp.difference_prix]);
    }
    if (comp.difference_prix_m2) {
        data.push(['Différence au m²', comp.difference_prix_m2]);
    }
    data.push([]);

    // Comparaison par poste
    if (comp.comparaison_postes && comp.comparaison_postes.length > 0) {
        data.push(['COMPARAISON PAR CORPS D\'ÉTAT']);
        data.push(['Corps d\'état', 'Devis 1', 'Devis 2', 'Écart']);
        comp.comparaison_postes.forEach(poste => {
            data.push([
                poste.corps_etat || '',
                poste.prix_devis_1 || '',
                poste.prix_devis_2 || '',
                poste.ecart || ''
            ]);
        });
        data.push([]);
    }

    // Alertes de conformité
    if (comp.alertes_conformite && comp.alertes_conformite.length > 0) {
        data.push(['ALERTES DE CONFORMITÉ']);
        comp.alertes_conformite.forEach(alerte => {
            data.push([alerte]);
        });
        data.push([]);
    }

    // Différences notables
    if (comp.differences_notables && comp.differences_notables.length > 0) {
        data.push(['DIFFÉRENCES NOTABLES']);
        comp.differences_notables.forEach(diff => {
            data.push([diff]);
        });
    }

    return data;
}

/**
 * Construit les données pour la feuille de recommandation
 */
function buildRecommendationSheetData(reco) {
    const data = [['RECOMMANDATION'], []];

    if (reco.devis_recommande) {
        data.push(['Devis recommandé', reco.devis_recommande]);
    }

    if (reco.score_devis_1 || reco.score_devis_2) {
        data.push([]);
        data.push(['SCORES']);
        if (reco.score_devis_1) data.push(['Devis 1', reco.score_devis_1]);
        if (reco.score_devis_2) data.push(['Devis 2', reco.score_devis_2]);
    }

    if (reco.justification) {
        data.push([]);
        data.push(['JUSTIFICATION']);
        data.push([reco.justification]);
    }

    if (reco.points_negociation && reco.points_negociation.length > 0) {
        data.push([]);
        data.push(['POINTS DE NÉGOCIATION']);
        reco.points_negociation.forEach(point => {
            data.push([point]);
        });
    }

    return data;
}

/**
 * Export en PDF - Version améliorée avec graphiques
 */
async function exportToPDF() {
    if (!lastAnalysisData) {
        alert('Aucune analyse disponible pour l\'export');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const analysis = lastAnalysisData.analysis;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        let yPos = 20;
        let currentPage = 1;

        // Fonction helper pour ajouter une nouvelle page si nécessaire
        const checkAddPage = (spaceNeeded = 40) => {
            if (yPos + spaceNeeded > pageHeight - 20) {
                doc.addPage();
                currentPage++;
                yPos = 20;
                return true;
            }
            return false;
        };

        // Fonction pour ajouter pied de page
        const addFooter = () => {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
                pageWidth - 14, pageHeight - 10, { align: 'right' });
        };

        // Page 1: Titre et Résumé
        doc.setFontSize(24);
        doc.setTextColor(76, 175, 80);
        doc.text('Analyse de Devis BTP', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Rapport d'analyse généré automatiquement`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Résumé exécutif
        if (analysis.resume_executif) {
            checkAddPage(40);
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('RESUME EXECUTIF', 14, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            const lines = doc.splitTextToSize(analysis.resume_executif, pageWidth - 28);
            doc.text(lines, 14, yPos);
            yPos += (lines.length * 5) + 10;
        }

        // Recommandation
        if (analysis.recommandation) {
            checkAddPage(50);

            doc.setFontSize(16);
            doc.setTextColor(76, 175, 80);
            doc.text('RECOMMANDATION', 14, yPos);
            yPos += 8;

            if (analysis.recommandation.devis_recommande) {
                doc.setFontSize(14);
                doc.setTextColor(0, 150, 0);
                doc.text(`Devis recommandé: ${analysis.recommandation.devis_recommande}`, 14, yPos);
                yPos += 8;
            }

            if (analysis.recommandation.score_devis_1 || analysis.recommandation.score_devis_2) {
                doc.setFontSize(10);
                doc.setTextColor(60, 60, 60);
                if (analysis.recommandation.score_devis_1) {
                    doc.text(`Score Devis 1: ${analysis.recommandation.score_devis_1}`, 14, yPos);
                    yPos += 6;
                }
                if (analysis.recommandation.score_devis_2) {
                    doc.text(`Score Devis 2: ${analysis.recommandation.score_devis_2}`, 14, yPos);
                    yPos += 6;
                }
                yPos += 4;
            }

            if (analysis.recommandation.justification) {
                doc.setFontSize(10);
                const justLines = doc.splitTextToSize(analysis.recommandation.justification, pageWidth - 28);
                doc.text(justLines, 14, yPos);
                yPos += (justLines.length * 5) + 10;
            }
        }

        // Tableau comparatif des prix
        if (analysis.devis_1 && analysis.devis_2) {
            checkAddPage(60);

            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('COMPARAISON DES PRIX', 14, yPos);
            yPos += 5;

            const priceData = [
                [
                    '',
                    analysis.devis_1.nom_fournisseur || 'Devis 1',
                    analysis.devis_2.nom_fournisseur || 'Devis 2'
                ],
                [
                    'Prix HT',
                    analysis.devis_1.prix_total_ht || '-',
                    analysis.devis_2.prix_total_ht || '-'
                ],
                [
                    'Prix TTC',
                    analysis.devis_1.prix_total_ttc || '-',
                    analysis.devis_2.prix_total_ttc || '-'
                ],
                [
                    'TVA',
                    analysis.devis_1.tva || '-',
                    analysis.devis_2.tva || '-'
                ]
            ];

            if (analysis.devis_1.ratio_prix_m2 || analysis.devis_2.ratio_prix_m2) {
                priceData.push([
                    'Prix au m²',
                    analysis.devis_1.ratio_prix_m2 || '-',
                    analysis.devis_2.ratio_prix_m2 || '-'
                ]);
            }

            doc.autoTable({
                startY: yPos,
                head: [priceData[0]],
                body: priceData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [76, 175, 80], textColor: 255 },
                styles: { fontSize: 10 }
            });

            yPos = doc.lastAutoTable.finalY + 10;
        }

        // Ajouter les anomalies de prix si disponibles
        if (lastAnalysisData.anomalies || (typeof window.MARKET_RATIOS_BTP !== 'undefined')) {
            checkAddPage(60);

            doc.setFontSize(16);
            doc.setTextColor(255, 152, 0);
            doc.text('ANOMALIES DE PRIX DETECTEES', 14, yPos);
            yPos += 8;

            const anomaliesData = [['Poste', 'Devis', 'Prix Constaté', 'Prix Marché', 'Écart', 'Sévérité']];

            // Anomalies devis 1
            if (lastAnalysisData.anomalies?.devis_1) {
                lastAnalysisData.anomalies.devis_1.forEach(anom => {
                    anomaliesData.push([
                        anom.tradeType || 'N/A',
                        'Devis 1',
                        anom.quotedPrice || '-',
                        anom.marketRange || '-',
                        anom.deviation || '-',
                        anom.severity || '-'
                    ]);
                });
            }

            // Anomalies devis 2
            if (lastAnalysisData.anomalies?.devis_2) {
                lastAnalysisData.anomalies.devis_2.forEach(anom => {
                    anomaliesData.push([
                        anom.tradeType || 'N/A',
                        'Devis 2',
                        anom.quotedPrice || '-',
                        anom.marketRange || '-',
                        anom.deviation || '-',
                        anom.severity || '-'
                    ]);
                });
            }

            if (anomaliesData.length > 1) {
                doc.autoTable({
                    startY: yPos,
                    head: [anomaliesData[0]],
                    body: anomaliesData.slice(1),
                    theme: 'grid',
                    headStyles: { fillColor: [255, 152, 0], textColor: 255 },
                    styles: { fontSize: 9 }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }
        }

        // Ajouter les vérifications SIRET si disponibles
        if (lastAnalysisData.siretVerifications) {
            checkAddPage(80);

            doc.setFontSize(16);
            doc.setTextColor(33, 150, 243);
            doc.text('VERIFICATIONS SIRET', 14, yPos);
            yPos += 8;

            const siretData = [['Devis', 'Entreprise', 'SIRET', 'Statut', 'Score']];

            if (lastAnalysisData.siretVerifications.devis_1) {
                const s1 = lastAnalysisData.siretVerifications.devis_1;
                siretData.push([
                    'Devis 1',
                    s1.denomination || 'N/A',
                    s1.siret || 'N/A',
                    s1.estActif ? 'Actif ✓' : 'Fermé ✗',
                    `${s1.scoreConfiance || 0}/100`
                ]);
            }

            if (lastAnalysisData.siretVerifications.devis_2) {
                const s2 = lastAnalysisData.siretVerifications.devis_2;
                siretData.push([
                    'Devis 2',
                    s2.denomination || 'N/A',
                    s2.siret || 'N/A',
                    s2.estActif ? 'Actif ✓' : 'Fermé ✗',
                    `${s2.scoreConfiance || 0}/100`
                ]);
            }

            if (siretData.length > 1) {
                doc.autoTable({
                    startY: yPos,
                    head: [siretData[0]],
                    body: siretData.slice(1),
                    theme: 'grid',
                    headStyles: { fillColor: [33, 150, 243], textColor: 255 },
                    styles: { fontSize: 10 }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }
        }

        // Capture des graphiques si disponibles
        const captureChart = async (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;

            try {
                // Utiliser html2canvas pour capturer le canvas
                const chartCanvas = await html2canvas(canvas, {
                    backgroundColor: '#1a1a1a',
                    scale: 2
                });
                return chartCanvas.toDataURL('image/png');
            } catch (error) {
                console.error(`Erreur capture graphique ${canvasId}:`, error);
                return null;
            }
        };

        // Ajouter les graphiques si disponibles
        const chart1 = await captureChart('tradeChart1');
        const chart2 = await captureChart('tradeChart2');
        const compChart = await captureChart('comparisonChart');

        if (chart1 || chart2 || compChart) {
            doc.addPage();
            currentPage++;
            yPos = 20;

            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('📊 Visualisations Graphiques', 14, yPos);
            yPos += 10;

            if (chart1) {
                checkAddPage(80);
                doc.addImage(chart1, 'PNG', 14, yPos, 90, 60);
                yPos += 65;
            }

            if (chart2) {
                checkAddPage(80);
                if (chart1) {
                    doc.addImage(chart2, 'PNG', 110, yPos - 65, 90, 60);
                } else {
                    doc.addImage(chart2, 'PNG', 14, yPos, 90, 60);
                    yPos += 65;
                }
            }

            if (compChart) {
                if (yPos > pageHeight - 100) {
                    doc.addPage();
                    currentPage++;
                    yPos = 20;
                }
                doc.addImage(compChart, 'PNG', 14, yPos, pageWidth - 28, 70);
                yPos += 75;
            }
        }

        // Ajouter pieds de page sur toutes les pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            currentPage = i;
            addFooter();
        }

        // Télécharger le PDF
        const fileName = `analyse_devis_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);

        console.log(`✅ Export PDF créé: ${fileName}`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'export PDF:', error);
        alert('Erreur lors de l\'export PDF. Consultez la console pour plus de détails.');
    }
}

// Attacher les événements aux boutons
document.addEventListener('DOMContentLoaded', () => {
    const excelBtn = document.getElementById('exportExcelBtn');
    const pdfBtn = document.getElementById('exportPdfBtn');

    if (excelBtn) {
        excelBtn.addEventListener('click', exportToExcel);
    }

    if (pdfBtn) {
        pdfBtn.addEventListener('click', exportToPDF);
    }
});
