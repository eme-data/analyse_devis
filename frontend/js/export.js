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
 * Export en PDF
 */
function exportToPDF() {
    if (!lastAnalysisData) {
        alert('Aucune analyse disponible pour l\'export');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const analysis = lastAnalysisData.analysis;

        let yPos = 20;

        // Titre
        doc.setFontSize(20);
        doc.setTextColor(76, 175, 80);
        doc.text('Analyse de Devis BTP', 105, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // Résumé exécutif
        if (analysis.resume_executif) {
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Résumé Exécutif', 14, yPos);
            yPos += 7;

            doc.setFontSize(10);
            const lines = doc.splitTextToSize(analysis.resume_executif, 180);
            doc.text(lines, 14, yPos);
            yPos += (lines.length * 5) + 10;
        }

        // Recommandation
        if (analysis.recommandation) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Recommandation', 14, yPos);
            yPos += 7;

            doc.setFontSize(12);
            if (analysis.recommandation.devis_recommande) {
                doc.setTextColor(76, 175, 80);
                doc.text(`Devis recommandé: ${analysis.recommandation.devis_recommande}`, 14, yPos);
                yPos += 7;
            }

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            if (analysis.recommandation.justification) {
                const justLines = doc.splitTextToSize(analysis.recommandation.justification, 180);
                doc.text(justLines, 14, yPos);
                yPos += (justLines.length * 5) + 10;
            }
        }

        // Tableau comparatif des prix
        if (analysis.devis_1 && analysis.devis_2) {
            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.text('Comparaison des Prix', 14, yPos);
            yPos += 5;

            const priceData = [[
                '',
                analysis.devis_1.nom_fournisseur || 'Devis 1',
                analysis.devis_2.nom_fournisseur || 'Devis 2'
            ]];

            if (analysis.devis_1.prix_total_ht || analysis.devis_2.prix_total_ht) {
                priceData.push([
                    'Prix HT',
                    analysis.devis_1.prix_total_ht || '-',
                    analysis.devis_2.prix_total_ht || '-'
                ]);
            }

            if (analysis.devis_1.prix_total_ttc || analysis.devis_2.prix_total_ttc) {
                priceData.push([
                    'Prix TTC',
                    analysis.devis_1.prix_total_ttc || '-',
                    analysis.devis_2.prix_total_ttc || '-'
                ]);
            }

            doc.autoTable({
                startY: yPos,
                head: [priceData[0]],
                body: priceData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [76, 175, 80] }
            });

            yPos = doc.lastAutoTable.finalY + 10;
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
