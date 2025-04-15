// ======================================== Initialization and Core Setup ========================================
/**
 * @file script.js
 * @description Core functionality for the Barcode & Signature Scanner application.
 *             Handles file processing, barcode detection, signature analysis,
 *             and UI interactions.
 *
 * Features:
 * - File upload handling (drag & drop and click-to-upload)
 * - PDF and image processing
 * - Barcode detection using Dynamsoft Barcode Reader
 * - Signature detection using pixel analysis
 * - Real-time progress updates
 * - Results management and export
 */

// DOM Elements - UI Components
const progressModal = document.getElementById('progressModal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const errorMessage = document.getElementById('errorMessage');
const scanBtn = document.getElementById('scanBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const progressContainer = document.getElementById('progressContainer');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const progressBar = document.getElementById('progressBar');
const exportBtn = document.getElementById('exportBtn');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const barcodeDetails = document.getElementById('barcodeDetails');
const barcodeDetailsContent = document.getElementById('barcodeDetailsContent');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingProgress = document.getElementById('loadingProgress');

// Application State Variables
/** @type {File[]} Array of files queued for processing */
let filesToProcess = [];
/** @type {Object[]} Array of all detected barcode's with their metadata */
let allBarcodeResults = [];
/** @type {Dynamsoft.DBR.BarcodeReader} Instance of Dynamsoft barcode reader */
let reader = null;

// Event listener for the close button
document.getElementById('noFilesModalClose')?.addEventListener('click', hideNoFilesModal);

// Event listeners for the clear result confirmation modal buttons
document.getElementById('confirmClearCancel')?.addEventListener('click', hideConfirmClearModal);

// Confirm Clear Button Event Listener
document.getElementById('confirmClearConfirm')?.addEventListener('click', () => {
    hideConfirmClearModal();
    showClearingModal();
    
    // Wait 3 seconds before actually clearing
    setTimeout(() => {
        clearResults();
        hideClearingModal();
        showClearSuccessModal();
    }, 3000);
});

// Cancel Clear Button Event Listener
document.getElementById('confirmClearCancel')?.addEventListener('click', hideConfirmClearModal);

// Success Modal OK Button Event Listener
document.getElementById('clearSuccessOk')?.addEventListener('click', hideClearSuccessModal);

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-green-500', 'bg-green-50');
    dropZone.classList.remove('border-gray-400');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-green-500', 'bg-green-50');
    dropZone.classList.add('border-gray-400');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-green-500', 'bg-green-50');
    dropZone.classList.add('border-gray-400');

    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// Function to show the no files modal with animation
function showNoFilesModal() {
    const modal = document.getElementById('noFilesModal');
    modal.classList.add('show');

    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';
}

// Function to hide the no files modal with animation
function hideNoFilesModal() {
    const modal = document.getElementById('noFilesModal');
    modal.classList.remove('show');

    // Re-enable scrolling
    document.body.style.overflow = 'auto';
}

// Function to show loading indicator with animation
function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Function to hide loading indicator with animation
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Show/hide progress modal with animation
function showProgressModal() {
    const modal = document.getElementById('progressModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

function hideProgressModal() {
    const modal = document.getElementById('progressModal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// Show/hide export modal with animation
function showExportModal() {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

function hideExportModal() {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function showClearingModal() {
    const modal = document.getElementById('clearingModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function hideClearingModal() {
    const modal = document.getElementById('clearingModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

function showClearSuccessModal() {
    const modal = document.getElementById('clearSuccessModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function hideClearSuccessModal() {
    const modal = document.getElementById('clearSuccessModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

scanBtn.addEventListener('click', processFiles);
exportBtn.addEventListener('click', exportResults);

clearResultsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showConfirmClearModal();
})

// Helper functions for the clear result confirmation modal:
function showConfirmClearModal() {
    const modal = document.getElementById('confirmClearModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function hideConfirmClearModal() {
    const modal = document.getElementById('confirmClearModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

async function initializeAll() {
    showLoadingIndicator();

    try {
        loadingProgress.textContent = 'Initializing barcode scanner...';
        await initializeDynamsoft();

        loadingProgress.textContent = 'Ready to scan!';
        setTimeout(() => {
            hideLoadingIndicator();
        }, 1000);
    } catch (error) {
        console.error("Initialization error:", error);
        loadingProgress.textContent = `Error: ${error.message}`;
        setTimeout(() => {
            hideLoadingIndicator();
            showError("Initialization failed. Please refresh the page.");
        }, 1000);
    }
}

// Call this when the page loads
window.addEventListener('DOMContentLoaded', () => {
    initializeAll();
    // setupClearResultsConfirmation();
});

// ======================================== File Handling Functions ========================================
/**
 * Functions for File Processing
 */

/**
 * Handles file uploads from drag-and-drop or file input.
 * Validates files for type and size, then prepares them for processing.
 * 
 * Validation:
 * - File types: PDF, PNG, JPG
 * - Maximum size: 10MB per file
 * 
 * @param {FileList} files - List of files from input or drag event
 * @returns {void}
 */
function handleFiles(files) {
    errorMessage.classList.add('hidden');
    filesToProcess = [];
    fileList.innerHTML = '';

    const validFiles = Array.from(files).filter(file => {
        const isValidType = file.type.match('image.*') || file.type === 'application/pdf';
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

        if (!isValidType) {
            showError(`Invalid file type: ${file.name}. Only PDF, PNG, JPG are allowed.`);
            return false;
        }

        if (!isValidSize) {
            showError(`File too large: ${file.name}. Max 10MB allowed.`);
            return false;
        }

        return true;
    });

    if (validFiles.length > 0) {
        filesToProcess = validFiles;
        renderFileList();
        resultsSection.classList.add('hidden');
    }
}

function renderFileList() {
    fileList.innerHTML = filesToProcess.map(file => `
        <div class="flex items-center justify-center p-3 bg-gray-50 border-2 rounded-xl">
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-700 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    ${file.type === 'application/pdf' ?
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />' :
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />'}
                </svg>
                <span class="text-blue-700">${file.name}</span>
            </div>
            <span class="text-sm text-blue-500 ml-5">${formatFileSize(file.size)}</span>
        </div>
    `).join('');
}

/**
 * Creates a canvas element from an image file.
 * 
 * @param {File} file - The image file to convert
 * @returns {Promise<HTMLCanvasElement>} Canvas containing the image
 */
async function createCanvasFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(img.src); // Clean up memory
            resolve(canvas);
        };
        img.onerror = (err) => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

// Functions that identify the size of the files
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
}

// ======================================== Barcode Processing Functions ========================================
/**
 * Initializes the Dynamsoft Barcode Reader with optimal settings for Code 39 detection.
 * 
 * @async
 * @function initializeDynamsoft
 * @throws {Error} If initialization fails or license is invalid
 * @returns {Promise<void>}
 */
async function initializeDynamsoft() {
    try {
        // Initialize the barcode reader
        reader = await Dynamsoft.DBR.BarcodeReader.createInstance();

        // CORRECTED: Use the proper method to update settings
        let settings = await reader.getRuntimeSettings();

        // Dynamsoft supports multiple formats
        settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39; // Only Code 39 for now

        // Another baracode format just uncomment the line below and add | after Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39;
        // Dynamsoft.DBR.EnumBarcodeFormat.BF_QR_CODE |
        // Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_128 |
        // Dynamsoft.DBR.EnumBarcodeFormat.BF_UPC_A;

        // Optimize for accuracy/speed
        settings.deblurLevel = 3;          // Better for blurry barcode's

        // Apply the updated settings
        await reader.updateRuntimeSettings(settings);

        console.log("Dynamsoft Barcode Reader initialized successfully");
    } catch (ex) {
        console.error("Initialization failed:", ex);
        throw ex;
    }
}

/**
 * Processes all queued files sequentially, detecting barcodes and signatures.
 * Updates the UI with progress and results.
 * 
 * Steps:
 * 1. Initializes Dynamsoft if not already done.
 * 2. Processes each file (PDF or image).
 * 3. Detects barcodes and signatures.
 * 4. Updates the results table.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function processFiles() {
    // Check if no files are selected
    if (filesToProcess.length === 0) {
        showNoFilesModal();
        return;
    }

    try {
        showProgressModal();

        // Show modal when starting
        // progressModal.classList.remove('hidden');

        // Initialize Dynamsoft if not already done
        if (!reader) await initializeDynamsoft();
        if (filesToProcess.length === 0) {
            progressModal.classList.add('hidden');
            return;
        }

        // Reset state
        allBarcodeResults = [];
        resultsBody.innerHTML = '';
        scanBtn.disabled = true;
        resultsSection.classList.add('hidden');

        // Clear any previous error messages
        errorMessage.classList.add('hidden');

        // Process each file sequentially
        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            const progress = (i / filesToProcess.length) * 100;
            updateProgress(progress, `Processing ${i + 1} of ${filesToProcess.length}: ${file.name}`);

            try {
                // Process the file with Dynamsoft
                let result;
                if (file.type === 'application/pdf') {
                    // Use enhanced region detection for PDFs
                    result = await processPDFWithRegionDetection(file);

                    addResultToTable(file.name, result);

                    // Store all barcode results for export
                    allBarcodeResults.push(...result.barcodes.map(b => ({
                        ...b,
                        fileName: file.name,
                        hasSignature: b.hasSignature // Ensure hasSignature is included
                    })));
                } else {
                    const canvas = await createCanvasFromFile(file);
                    result = await processImageWithDynamsoft(file);
                    // For each barcode found, check for signatures to the right
                    for (const barcode of result.barcodes) {
                        // Detect signature specifically for this barcode
                        const signatureResult = await detectSignature(canvas, barcode.coordinates);
                        barcode.hasSignature = signatureResult.detected;

                        // Update visualization with signature detection info
                        barcode.visualization = createDynamsoftBarcodeVisualization(canvas, barcode);

                        // Update document-level signature flag if needed
                        result.signature = result.signature || barcode.hasSignature; // Use OR operator to accumulate signature status
                    }

                    // Add to results table
                    addResultToTable(file.name, result);

                    // Store all barcode results for export
                    allBarcodeResults.push(...result.barcodes.map(b => ({
                        ...b,
                        fileName: file.name,
                        hasSignature: b.hasSignature // Ensure hasSignature is included
                    })));
                }

            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                addResultToTable(file.name, {
                    error: error.message,
                    barcodes: [],
                    signature: false,
                    fileType: file.type,
                    fileName: file.name
                });
            }

            // Update progress
            updateProgress(((i + 1) / filesToProcess.length) * 100,
                `Processed ${i + 1} of ${filesToProcess.length} files...`);
        }

        // Finalize
        updateProgress(100, 'Processing complete!');
        scanBtn.disabled = false;
        resultsSection.classList.remove('hidden');

        // Hide modal when complete
        setTimeout(() => progressModal.classList.add('hidden'), 1000);

        // When complete:
        setTimeout(hideProgressModal, 1000);
    } catch (error) {
        console.error("Processing failed:", error);
        showError("Failed to initialize barcode scanner. Please refresh the page.");
        scanBtn.disabled = false;
        progressModal.classList.add('hidden');

        setTimeout(hideProgressModal, 300);
    }
}

/**
 * Processes a PDF file for barcode detection and signature analysis.
 * Handles multi-page PDFs by rendering each page to a canvas and analyzing it.
 * 
 * Process Flow:
 * 1. Loads PDF using PDF.js library
 * 2. Renders each page at high resolution (scale: 3.0)
 * 3. Detects barcodes using Dynamsoft SDK
 * 4. Analyzes areas near barcodes for signatures
 * 5. Sorts results by page number and position
 * 
 * @param {File} file - The PDF file to process
 * @returns {Promise<Object>} Processing results containing:
 *   - barcodes: Array of detected barcodes with metadata
 *   - signature: Boolean indicating if any signatures were found
 *   - error: Error message if processing failed
 *   - fileType: Always 'application/pdf'
 *   - fileName: Original file name
 */
async function processPDFWithRegionDetection(file) {
    const result = {
        barcodes: [],
        signature: false,
        error: null,
        fileType: file.type,
        fileName: file.name
    };

    try {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

        const fileReader = new FileReader();
        const pdfData = await new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(file);
        });

        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdfDoc.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            updateProgress(((pageNum - 1) / numPages) * 100, `Scanning page ${pageNum} of ${numPages} in ${file.name}`);

            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 5.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            await page.render({ canvasContext: ctx, viewport }).promise;

            if (!reader) await initializeDynamsoft();
            const barcodeResults = await reader.decode(canvas.toDataURL('image/jpeg', 0.99));

            for (const barcode of barcodeResults) {
                let points = barcode.localizationResult?.resultPoints || [];
                if (points.length < 4 && barcode.localizationResult?.x1 !== undefined) {
                    // Fallback: manually build corners from bounding box
                    points = [
                        [barcode.localizationResult.x1, barcode.localizationResult.y1],
                        [barcode.localizationResult.x2, barcode.localizationResult.y1],
                        [barcode.localizationResult.x2, barcode.localizationResult.y2],
                        [barcode.localizationResult.x1, barcode.localizationResult.y2]
                    ];
                }

                const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
                const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

                const sigResult = await detectSignature(canvas, points);
                const hasSignature = sigResult.detected;

                result.barcodes.push({
                    code: barcode.barcodeText,
                    format: barcode.barcodeFormatString,
                    confidence: barcode.localizationResult?.confidence || 0,
                    coordinates: points,
                    centerX,
                    centerY,
                    hasSignature,
                    signatureConfidence: sigResult.confidence,
                    page: pageNum,
                });

                if (hasSignature) result.signature = true;
            }
        }

        // Sort barcode's by page, then by position (top to bottom, then left to right)
        result.barcodes.sort((a, b) => {
            // First sort by page number
            if (a.page !== b.page) {
                return a.page - b.page;
            }

            // Define a threshold for considering barcodes to be on the same "row"
            const rowThreshold = 30; // pixels

            // If barcodes are roughly on the same horizontal line, sort by X
            if (Math.abs(a.centerY - b.centerY) < rowThreshold) {
                return a.centerX - b.centerX; // Left to right
            }

            // Otherwise sort by Y coordinate
            return a.centerY - b.centerY; // Top to bottom
        });

    } catch (error) {
        console.error("Row-based scanning failed:", error);
        result.error = error.message;
    }

    return result;
}

/**
 * Processes an image file for barcode detection and signature analysis.
 * 
 * Steps:
 * 1. Loads the image with size validation.
 * 2. Creates a canvas with native resolution.
 * 3. Configures optimized decoding settings for Dynamsoft.
 * 4. Detects barcodes and analyzes nearby regions for signatures.
 * 5. Sorts results by position.
 * 
 * @param {File} file - The image file to process
 * @returns {Promise<Object>} Processing results (same structure as PDF processing)
 */
async function processImageWithDynamsoft(file) {
    const result = {
        barcodes: [],
        signature: false,
        error: null,
        fileType: file.type,
        fileName: file.name
    };

    try {
        // 1. Load image with size validation
        const img = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Validate file size (10MB limit)
                if (file.size > 10 * 1024 * 1024) {
                    reject(new Error('File size exceeds 10MB limit'));
                    URL.revokeObjectURL(img.src); // Cleanup
                    return;
                }
                resolve(img);
            };
            img.onerror = (e) => reject(new Error(`Image load failed: ${e.message}`));
            img.src = URL.createObjectURL(file);
        });

        // 2. Create canvas with native resolution (no scaling)
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);

        // 3. Configure optimized decoding settings
        if (!reader) await initializeDynamsoft();
        const barcodeResults = await reader.decode(canvas, {
            // Reduced memory footprint settings
            deblurLevel: 3,          // Balance between accuracy and memory
            scaleDownThreshold: 800, // Auto-scale large images
            maxParallelTasks: 1,     // Reduce memory spikes
            region: {                // Focus on central area
                regionLeft: 10,
                regionTop: 10,
                regionRight: 90,
                regionBottom: 90,
                regionMeasuredByPercentage: 1
            }
        });

        // 4. Unified processing pipeline with PDF-style accuracy
        for (const barcode of barcodeResults) {
            let points = barcode.localizationResult?.resultPoints || [];

            // Coordinate fallback identical to PDF processing
            if (points.length < 4 && barcode.localizationResult?.x1 !== undefined) {
                points = [
                    [barcode.localizationResult.x1, barcode.localizationResult.y1],
                    [barcode.localizationResult.x2, barcode.localizationResult.y1],
                    [barcode.localizationResult.x2, barcode.localizationResult.y2],
                    [barcode.localizationResult.x1, barcode.localizationResult.y2]
                ];
            }

            const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
            const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

            // PDF-style signature detection
            const sigResult = await detectSignature(canvas, points);
            const hasSignature = sigResult.detected;

            result.barcodes.push({
                code: barcode.barcodeText,
                format: barcode.barcodeFormatString,
                confidence: barcode.localizationResult?.confidence || 0,
                coordinates: points,
                centerX,
                centerY,
                hasSignature,
                signatureConfidence: sigResult.confidence
            });
        }

        // 5. Memory cleanup
        canvas.width = 0;
        canvas.height = 0;

        // Sort barcodes by page, then by position (top to bottom, then left to right)
        result.barcodes.sort((a, b) => {
            // First sort by page number
            if (a.page !== b.page) {
                return a.page - b.page;
            }

            // Define a threshold for considering barcodes to be on the same "row"
            const rowThreshold = 30; // pixels

            // If barcodes are roughly on the same horizontal line, sort by X
            if (Math.abs(a.centerY - b.centerY) < rowThreshold) {
                return a.centerX - b.centerX; // Left to right
            }

            // Otherwise sort by Y coordinate
            return a.centerY - b.centerY; // Top to bottom
        });

        // result.signature = result.barcodes.some(b => b.hasSignature);

    } catch (error) {
        result.error = error.message;
        console.error("Error processing image:", error);
    }

    return result;
}

/**
 * Creates a visual representation of barcode detection results.
 * 
 * @param {HTMLCanvasElement} sourceCanvas - Original image canvas
 * @param {Object} barcode - Barcode detection result
 * @returns {string} Data URL of the visualization image
 */
function createDynamsoftBarcodeVisualization(sourceCanvas, barcode) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);

    // Draw detection box
    ctx.strokeStyle = barcode.hasSignature ? '#00ff88' : '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    barcode.coordinates.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.stroke();

    // Add text annotation
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(
        `${barcode.format}: ${barcode.code} (${Math.round(barcode.confidence)}%)`,
        barcode.coordinates[0][0] + 10,
        barcode.coordinates[0][1] - 10
    );

    return canvas.toDataURL();
}

// ======================================== Signature Detection Functions ========================================
/**
 * Analyzes the area to the right of a barcode for potential signatures.
 * Uses pixel analysis and pattern recognition to detect handwritten signatures.
 * 
 * Algorithm:
 * 1. Calculates signature search area based on barcode dimensions
 * 2. Extracts the region of interest from the canvas
 * 3. Analyzes pixel density and stroke patterns
 * 4. Determines signature presence using configurable thresholds
 * 
 * @param {HTMLCanvasElement} canvas - The canvas containing the full image
 * @param {Array<Array<number>>} barcodeCoordinates - Array of [x,y] coordinates defining barcode corners
 * @returns {Object} Detection result containing:
 *   - detected: boolean - Whether a signature was detected
 *   - confidence: number - Confidence score (0-100)
 *   - analysisData: Object - Detailed analysis metrics
 */
function detectSignature(canvas, barcodeCoordinates) {
    if (!barcodeCoordinates || barcodeCoordinates.length < 4) {
        console.warn("⚠️ Barcode coordinates missing or invalid");
        return { detected: false };
    }

    // Calculate barcode boundaries with proper validation
    const minX = Math.max(0, Math.min(...barcodeCoordinates.map(p => p[0])));
    const maxX = Math.min(canvas.width, Math.max(...barcodeCoordinates.map(p => p[0])));
    const minY = Math.max(0, Math.min(...barcodeCoordinates.map(p => p[1])));
    const maxY = Math.min(canvas.height, Math.max(...barcodeCoordinates.map(p => p[1])));

    // Ensure valid dimensions
    const barcodeHeight = Math.max(1, maxY - minY);
    const barcodeWidth = Math.max(1, maxX - minX);

    // Configuration for signature scanning
    const scanOptions = {
        pixelThreshold: 200,       // Higher threshold for darker signatures
        minDensity: 0.03,          // Lower density threshold
        minStrokeDensity: 0.005,   // Lower stroke density threshold
        minSignatureWidth: 30,     // Smaller width for signature strokes
        minBlocks: 2,              // Require at least 2 potential signature blocks
        maxTextLikeDensity: 0.08,
        minStrokeVariation: 0.3
    };

    // Calculate signature area with proper bounds checking
    const signatureAreaWidth = Math.min(
        canvas.width * 1,
        Math.max(barcodeWidth * 2, 450)
    );

    const signatureAreaX = Math.min(
        canvas.width - signatureAreaWidth,
        Math.max(0, maxX + (barcodeWidth * 0.7))
    );

    // Ensure minimum height and proper bounds
    const signatureAreaHeight = Math.max(
        100,
        Math.min(
            barcodeHeight * 7,
            canvas.height * 0.3
        )
    );

    const signatureAreaY = Math.max(
        0,
        Math.min(
            canvas.height - signatureAreaHeight,
            minY - (barcodeHeight * 0.2)
        )
    );

    // Final validation of dimensions
    if (signatureAreaWidth <= 0 || signatureAreaHeight <= 0) {
        console.warn("⚠️ Invalid signature area dimensions", {
            width: signatureAreaWidth,
            height: signatureAreaHeight
        });
        return { detected: false };
    }

    // Create canvas with validated dimensions
    const signatureCanvas = document.createElement('canvas');
    signatureCanvas.width = Math.max(1, Math.floor(signatureAreaWidth));
    signatureCanvas.height = Math.max(1, Math.floor(signatureAreaHeight));
    const signatureCtx = signatureCanvas.getContext('2d');

    try {
        // Draw the signature area
        signatureCtx.drawImage(
            canvas,
            Math.floor(signatureAreaX),
            Math.floor(signatureAreaY),
            Math.floor(signatureAreaWidth),
            Math.floor(signatureAreaHeight),
            0,
            0,
            Math.floor(signatureAreaWidth),
            Math.floor(signatureAreaHeight)
        );

        // // For debugging - show the analyzed area ==========================================================
        // signatureCanvas.style.border = "2px solid green";
        // signatureCanvas.style.width = "100%";
        // signatureCanvas.style.height = "10%";
        // signatureCanvas.style.marginBottom = "20px";
        // document.body.appendChild(signatureCanvas);

        // Analyze the area
        const result = analyzeSignatureArea(
            signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height),
            signatureCanvas.width,
            signatureCanvas.height,
            scanOptions
        );

        console.log("✅ Signature Analysis Result", {
            result,
            scanArea: {
                x: signatureAreaX,
                y: signatureAreaY,
                width: signatureAreaWidth,
                height: signatureAreaHeight
            },
            barcodeDimensions: {
                width: barcodeWidth,
                height: barcodeHeight
            },
            signatureStatus: result.detected ? "Detected" : "None",
            confidenceLevel: `${result.confidence.toFixed(1)}%`,
        });

        return {
            detected: result.detected,
            confidence: result.confidence,
            analysisData: result
        };

    } catch (error) {
        console.error("Signature detection error:", error);
        return { detected: false };
    }
}

/**
 * Performs detailed analysis of a potential signature area using pixel-level metrics.
 * 
 * Analysis Methods:
 * 1. Dark Pixel Density: Measures overall ink coverage
 * 2. Stroke Transitions: Counts dark-to-light transitions for stroke analysis
 * 3. Block Analysis: Identifies continuous dark regions that could be signature strokes
 * 4. Pattern Recognition: Distinguishes between handwritten strokes and printed text
 * 
 * @param {ImageData} imageData - Raw pixel data of the signature area
 * @param {number} width - Width of the analysis area in pixels
 * @param {number} height - Height of the analysis area in pixels
 * @param {Object} options - Analysis configuration parameters:
 *   - pixelThreshold: number - Brightness threshold for dark pixel detection (0-255)
 *   - minDensity: number - Minimum ratio of dark pixels to total pixels
 *   - minStrokeDensity: number - Minimum density of stroke transitions
 *   - minSignatureWidth: number - Minimum width of potential signature strokes
 *   - minBlocks: number - Minimum number of distinct stroke blocks
 * @returns {Object} Analysis results containing:
 *   - detected: boolean - Whether a signature was detected
 *   - pixelDensity: number - Ratio of dark pixels to total pixels
 *   - strokeDensity: number - Density of stroke transitions
 *   - potentialBlocks: number - Count of potential signature strokes
 *   - maxBlockLength: number - Length of longest continuous stroke
 *   - confidence: number - Overall confidence score (0-100)
 */
function analyzeSignatureArea(imageData, width, height, options) {
    const opts = options || {
        pixelThreshold: 120,
        minDensity: 0.03,
        minStrokeDensity: 0.01,
        minSignatureWidth: 30,
        minBlocks: 2
    };

    let darkPixels = 0;
    let strokeTransitions = 0;
    let prevDark = false;
    let currentBlockLength = 0;
    let potentialBlocks = 0;
    let maxBlockLength = 0;

    // Analyze each pixel
    for (let i = 0; i < imageData.data.length; i += 4) {
        const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        const isDark = brightness < opts.pixelThreshold;

        if (isDark) {
            darkPixels++;
            if (!prevDark) {
                strokeTransitions++;
            }
            currentBlockLength++;
        } else {
            if (currentBlockLength >= opts.minSignatureWidth) {
                potentialBlocks++;
                maxBlockLength = Math.max(maxBlockLength, currentBlockLength);
            }
            currentBlockLength = 0;
        }
        prevDark = isDark;
    }

    // Check for any remaining block at end
    if (currentBlockLength >= opts.minSignatureWidth) {
        potentialBlocks++;
        maxBlockLength = Math.max(maxBlockLength, currentBlockLength);
    }

    // Calculate densities
    const totalPixels = width * height;
    const pixelDensity = darkPixels / totalPixels;
    const strokeDensity = strokeTransitions / totalPixels;

    // Enhanced detection logic
    const detected = (
        (pixelDensity >= opts.minDensity) &&
        (strokeDensity >= opts.minStrokeDensity) &&
        (potentialBlocks >= opts.minBlocks || maxBlockLength >= opts.minSignatureWidth * 3)
    );

    // More nuanced confidence calculation
    const confidence = Math.min(100,
        (pixelDensity * 120) +
        (strokeDensity * 60) +
        (potentialBlocks * 15) +
        (maxBlockLength * 0.2)
    );

    return {
        detected,
        pixelDensity,
        strokeDensity,
        potentialBlocks,
        maxBlockLength,
        confidence
    };
}

// ======================================== UI Update Functions ========================================
/**
 * Updates the progress bar and status text in the UI.
 * Provides visual feedback during file processing.
 * 
 * Features:
 * - Smooth progress bar animation
 * - Color change at completion (green -> blue)
 * - Percentage and status text updates
 * 
 * @param {number} percent - Progress percentage (0-100)
 * @param {string} text - Status message to display
 * @returns {void}
 */
function updateProgress(percent, text) {
    // Smooth progress bar animation
    progressBar.style.transition = 'width 0.3s ease';
    progressBar.style.width = `${percent}%`;

    // Update text
    progressPercent.textContent = `${Math.round(percent)}%`;
    progressText.textContent = text;

    // Change color when complete
    if (percent >= 100) {
        progressBar.classList.remove('bg-green-600');
        progressBar.classList.add('bg-blue-600');
    } else {
        progressBar.classList.remove('bg-blue-600');
        progressBar.classList.add('bg-green-600');
    }
}

/**
 * Exports scan results to a CSV file.
 * Includes all detected barcodes and signatures from processed files.
 * 
 * CSV Format:
 * - File Name: Original document name
 * - File Type: PDF/Image type
 * - Barcode Type: Format of detected barcode
 * - Barcode Value: Decoded barcode content
 * - Confidence: Barcode detection confidence
 * - Signature Detected: Yes/No
 * - Signature Confidence: Detection confidence
 * - Status: Processing outcome
 * - Time: Export timestamp
 * 
 * @returns {void} Downloads CSV file directly through browser
 */
function exportResults() {
    if (allBarcodeResults.length === 0 && resultsBody.children.length === 0) {
        showError('No results to export');
        return;
    }

    // // CSV headers
    // let csvContent = "File Name,File Type,Barcode Type,Barcode Value,Confidence,Signature Detected,Signature Confidence,Status,Time\n";

    // // Get all rows from results table
    // const rows = Array.from(resultsBody.querySelectorAll('tr'));

    // rows.forEach(row => {
    //     const filename = row.dataset.filename;
    //     const cells = row.querySelectorAll('td');

    //     const fileType = cells[0].querySelector('div:nth-child(2)').textContent;
    //     const status = cells[3].querySelector('span').textContent;
    //     const time = new Date().toLocaleString();

    //     // Get barcodes for this file
    //     const fileBarcodes = allBarcodeResults.filter(b => b.fileName === filename);

    //     if (fileBarcodes.length > 0) {
    //         fileBarcodes.forEach(barcode => {
    //             csvContent += `"${filename}",` +                                        // File Name
    //                           `"${fileType}",` +                                        // File Type
    //                           `"${barcode.format || 'Unknown'}",` +                     // Barcode Type
    //                           `"${barcode.code}",` +                                    // Barcode Value
    //                           `"${barcode.confidence?.toFixed(1) || '0'}%",` +          // Confidence
    //                           `"${barcode.hasSignature ? 'Detected' : 'None'}",` +      // Signature Detected
    //                           `"${barcode.signatureConfidence?.toFixed(1) || '0'}%",` + // Signature Confidence
    //                           `"${status}",` +                                          // Status
    //                           `"${time}"\n`;                                            // Time
    //         });
    //     } else {
    //         // For files with no barcodes but potentially signatures
    //         const signatureCell = cells[2].querySelector('span');
    //         const hasSignature = signatureCell.textContent.includes('detected');

    //         csvContent += `"${filename}",` +                            // File Name
    //                       `"${fileType}",` +                            // File Type
    //                       `"",` +                                       // Barcode Type (empty)
    //                       `"",` +                                       // Barcode Value (empty)
    //                       `"0%",` +                                     // Confidence (0%)
    //                       `"${hasSignature ? 'Detected' : 'None'}",` +  // Signature Detected
    //                       `"0%",` +                                     // Signature Confidence (0%)
    //                       `"${status}",` +                              // Status
    //                       `"${time}"\n`;                                // Time
    //     }
    // });

    showExportModal();

    // Delay the export to allow the modal to be seen
    setTimeout(() => {
        // Get the first processed filename to use for export
        const firstFileName = filesToProcess.length > 0 ?
            filesToProcess[0].name.replace(/\.[^/.]+$/, "") : // Remove extension
            "scan_results";

        // CSV headers
        let csvContent = "Barcode,Signature\n";

        // Add all barcode results
        allBarcodeResults.forEach(barcode => {
            csvContent += `"${barcode.code}",` +                   // Barcode
                `"${barcode.hasSignature ? 1 : 0}"\n`;   // Signature (1=present, 0=absent)
        });

        // Create and download the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${firstFileName}_results.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Hide the modal after a short delay
        setTimeout(hideExportModal, 500);
    }, 1000);
}

/**
 * Resets the application state and clears all results.
 * 
 * Actions:
 * - Clears file processing queue
 * - Clears stored barcode results
 * - Resets file list display
 * - Clears results table
 * - Hides barcode details panel
 * - Hides results section
 * - Resets file input
 * 
 * @returns {void}
 */
function clearResults() {
    filesToProcess = [];
    allBarcodeResults = [];
    fileList.innerHTML = '';
    resultsBody.innerHTML = '';
    barcodeDetails.classList.add('hidden');
    resultsSection.classList.add('hidden');
    fileInput.value = '';
}

function setupClearResultsConfirmation() {
    const clearBtn = document.getElementById('clearResultsBtn');
    const cancelBtn = document.getElementById('confirmClearCancel');
    const confirmBtn = document.getElementById('confirmClearConfirm');

    clearBtn.addEventListener('click', showConfirmClearModal);
    cancelBtn.addEventListener('click', hideConfirmClearModal);
    confirmBtn.addEventListener('click', () => {
        hideConfirmClearModal();
        clearResults();
    });
}