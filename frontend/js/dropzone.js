/**
 * Gestion du drag-and-drop pour les zones de dépôt de fichiers
 */

class DropZoneManager {
    constructor(dropzoneElement, fileInputElement) {
        this.dropzone = dropzoneElement;
        this.fileInput = fileInputElement;
        this.file = null;

        this.init();
    }

    init() {
        // Événements de drag & drop
        this.dropzone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        this.dropzone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropzone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropzone.addEventListener('drop', (e) => this.handleDrop(e));

        // Événements de clic pour sélection manuelle
        const selectBtn = this.dropzone.querySelector('.select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => this.fileInput.click());
        }

        // Événement de changement de fichier
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Bouton de suppression
        const removeBtn = this.dropzone.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeFile());
        }
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.add('dragover');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        // Vérifier que la souris quitte vraiment la dropzone
        if (e.target === this.dropzone) {
            this.dropzone.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        this.dropzone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.setFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.setFile(files[0]);
        }
    }

    setFile(file) {
        // Validation du type de fichier
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];
        if (!validTypes.includes(file.type)) {
            alert(`Type de fichier non supporté: ${file.type}\nUtilisez PDF, JPG, PNG ou TXT.`);
            return;
        }

        // Validation de la taille (10 MB max)
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.size > maxSize) {
            alert(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} MB).\nTaille maximale: 10 MB.`);
            return;
        }

        this.file = file;
        this.showFilePreview();

        // Déclencher un événement personnalisé pour notifier le changement
        const event = new CustomEvent('filechange', { detail: { file } });
        this.dropzone.dispatchEvent(event);
    }

    showFilePreview() {
        // Cacher le contenu de la dropzone
        const dropzoneContent = this.dropzone.querySelector('.dropzone-content');
        const filePreview = this.dropzone.querySelector('.file-preview');

        if (dropzoneContent) dropzoneContent.style.display = 'none';
        if (filePreview) filePreview.style.display = 'flex';

        // Afficher les infos du fichier
        const fileName = filePreview.querySelector('.file-name');
        const fileSize = filePreview.querySelector('.file-size');

        if (fileName) fileName.textContent = this.file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(this.file.size);

        // Ajouter la classe has-file
        this.dropzone.classList.add('has-file');
    }

    removeFile() {
        this.file = null;
        this.fileInput.value = '';

        // Afficher le contenu de la dropzone
        const dropzoneContent = this.dropzone.querySelector('.dropzone-content');
        const filePreview = this.dropzone.querySelector('.file-preview');

        if (dropzoneContent) dropzoneContent.style.display = 'block';
        if (filePreview) filePreview.style.display = 'none';

        // Retirer la classe has-file
        this.dropzone.classList.remove('has-file');

        // Déclencher un événement personnalisé
        const event = new CustomEvent('filechange', { detail: { file: null } });
        this.dropzone.dispatchEvent(event);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getFile() {
        return this.file;
    }

    hasFile() {
        return this.file !== null;
    }
}

// Export pour utilisation dans app.js
window.DropZoneManager = DropZoneManager;
