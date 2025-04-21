// Global variables
let filesToProcess = []; // Array to store files selected for processing
let allBarcodeResults = []; // Array to store all barcode scan results
let reader = null; // Dynamsoft Barcode Reader instance

// DOM Elements
const progressModal = document.getElementById('progressModal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const errorMessage = document.getElementById('errorMessage');
const scanBtn = document.getElementById('scanBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const progressBar = document.getElementById('progressBar');
const exportBtn = document.getElementById('exportBtn');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const barcodeDetails = document.getElementById('barcodeDetails');
const barcodeDetailsContent = document.getElementById('barcodeDetailsContent');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingProgress = document.getElementById('loadingProgress');
const uploadForm = document.getElementById('uploadForm');

/**
 * Initializes the Dynamsoft Barcode Reader with custom settings
 * @async
 * @throws {Error} If initialization fails
 */
async function initializeDynamsoft() {
    try {
        // Create a new instance of the barcode reader
        reader = await Dynamsoft.DBR.BarcodeReader.createInstance();
        
        // Configure runtime settings for optimal Code 39 scanning
        let settings = await reader.getRuntimeSettings();
        settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39;
        settings.deblurLevel = 3; // Higher deblur level for better recognition
        await reader.updateRuntimeSettings(settings);
        console.log("Dynamsoft Barcode Reader initialized successfully");
    } catch (ex) {
        console.error("Initialization failed:", ex);
        throw ex;
    }
}

// Event Listeners for drag and drop functionality
dropZone.addEventListener('click', () => fileInput.click()); // Click handler for drop zone
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    // Visual feedback when dragging over drop zone
    dropZone.classList.add('border-green-500', 'bg-green-50');
    dropZone.classList.remove('border-gray-400');
});

dropZone.addEventListener('dragleave', () => {
    // Revert visual style when dragging leaves drop zone
    dropZone.classList.remove('border-green-500', 'bg-green-50');
    dropZone.classList.add('border-gray-400');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    // Revert visual style after drop
    dropZone.classList.remove('border-green-500', 'bg-green-50');
    dropZone.classList.add('border-gray-400');

    // Process dropped files
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    // Process files selected via file input
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

/**
 * Handles file selection and validation
 * @param {FileList} files - List of files to process
 */
function handleFiles(files) {
    errorMessage.classList.add('hidden');
    filesToProcess = [];
    fileList.innerHTML = '';

    // Filter files by type and size
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

/**
 * Renders the list of selected files in the UI
 */
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
 * Formats file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Displays an error message in the UI
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
}

/**
 * Main function to process all selected files
 * @async
 */
async function processFiles() {
    if (filesToProcess.length === 0) {
        showNoFilesModal();
        return;
    }

    try {
        showProgressModal();
        
        // Reset state for new processing
        allBarcodeResults = [];
        resultsBody.innerHTML = '';
        scanBtn.disabled = true;
        resultsSection.classList.add('hidden');
        errorMessage.classList.add('hidden');

        // Process each file sequentially with progress updates
        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            const progress = (i / filesToProcess.length) * 100;
            updateProgress(progress, `Processing ${i + 1} of ${filesToProcess.length}: ${file.name}`);

            try {
                let result;
                if (file.type === 'application/pdf') {
                    result = await processPDFWithRegionDetection(file);
                } else {
                    result = await processImageWithDynamsoft(file);
                }

                // Add to results table
                addResultToTable(file.name, result);

                // Store all barcode results for export
                if (result.barcodes) {
                    allBarcodeResults.push(...result.barcodes.map(b => ({
                        ...b,
                        fileName: file.name,
                        hasSignature: b.hasSignature || false
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

            updateProgress(((i + 1) / filesToProcess.length) * 100,
                `Processed ${i + 1} of ${filesToProcess.length} files...`);
        }
        
        // Finalize processing
        updateProgress(100, 'Processing complete!');
        scanBtn.disabled = false;
        resultsSection.classList.remove('hidden');
        setTimeout(hideProgressModal, 1000);
    } catch (error) {
        console.error("Processing failed:", error);
        showError("Failed to initialize barcode scanner. Please refresh the page.");
        scanBtn.disabled = false;
        setTimeout(hideProgressModal, 300);
    }
}

/**
 * Processes a PDF file to extract barcodes and detect signatures
 * @async
 * @param {File} file - PDF file to process
 * @returns {Object} Result object with barcodes and signature info
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
        // Configure PDF.js worker
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

        // Load PDF document
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdfDoc.numPages;

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            updateProgress(((pageNum - 1) / numPages) * 100, `Scanning page ${pageNum} of ${numPages} in ${file.name}`);

            // Render PDF page to canvas
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 5.0 }); // High scale for better detection
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Decode barcodes from the rendered page
            const barcodeResults = await reader.decode(canvas.toDataURL('image/jpeg', 0.99));

            // Process each detected barcode
            for (const barcode of barcodeResults) {
                let points = barcode.localizationResult?.resultPoints || [];
                if (points.length < 4 && barcode.localizationResult?.x1 !== undefined) {
                    points = [
                        [barcode.localizationResult.x1, barcode.localizationResult.y1],
                        [barcode.localizationResult.x2, barcode.localizationResult.y1],
                        [barcode.localizationResult.x2, barcode.localizationResult.y2],
                        [barcode.localizationResult.x1, barcode.localizationResult.y2]
                    ];
                }

                // Calculate center coordinates of barcode
                const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
                const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

                // Detect signature near the barcode
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

        // Sort barcodes by page and position
        result.barcodes.sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            const rowThreshold = 30;
            if (Math.abs(a.centerY - b.centerY) < rowThreshold) return a.centerX - b.centerX;
            return a.centerY - b.centerY;
        });

    } catch (error) {
        console.error("PDF processing failed:", error);
        result.error = error.message;
    }

    return result;
}

/**
 * Processes an image file to extract barcodes and detect signatures
 * @async
 * @param {File} file - Image file to process
 * @returns {Object} Result object with barcodes and signature info
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
        // Load image file
        const img = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error(`Image load failed: ${e.message}`));
            img.src = URL.createObjectURL(file);
        });

        // Draw image to canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);

        // Decode barcodes with optimized settings
        const barcodeResults = await reader.decode(canvas, {
            deblurLevel: 3,
            scaleDownThreshold: 800,
            maxParallelTasks: 1,
            region: {
                regionLeft: 10,
                regionTop: 10,
                regionRight: 90,
                regionBottom: 90,
                regionMeasuredByPercentage: 1
            }
        });

        // Process each detected barcode
        for (const barcode of barcodeResults) {
            let points = barcode.localizationResult?.resultPoints || [];
            if (points.length < 4 && barcode.localizationResult?.x1 !== undefined) {
                points = [
                    [barcode.localizationResult.x1, barcode.localizationResult.y1],
                    [barcode.localizationResult.x2, barcode.localizationResult.y1],
                    [barcode.localizationResult.x2, barcode.localizationResult.y2],
                    [barcode.localizationResult.x1, barcode.localizationResult.y2]
                ];
            }

            // Calculate center coordinates of barcode
            const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
            const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

            // Detect signature near the barcode
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

        // Sort barcodes by position
        result.barcodes.sort((a, b) => {
            const rowThreshold = 30;
            if (Math.abs(a.centerY - b.centerY) < rowThreshold) return a.centerX - b.centerX;
            return a.centerY - b.centerY;
        });

        // Clean up canvas
        canvas.width = 0;
        canvas.height = 0;

    } catch (error) {
        result.error = error.message;
        console.error("Error processing image:", error);
    }

    return result;
}

/**
 * Detects signatures near a barcode in an image
 * @param {HTMLCanvasElement} canvas - Canvas containing the image
 * @param {Array} barcodeCoordinates - Coordinates of the barcode
 * @returns {Object} Signature detection result
 */
function detectSignature(canvas, barcodeCoordinates) {
    if (!barcodeCoordinates || barcodeCoordinates.length < 4) {
        console.warn("⚠️ Barcode coordinates missing or invalid");
        return { detected: false };
    }

    // Calculate barcode bounding box
    const minX = Math.max(0, Math.min(...barcodeCoordinates.map(p => p[0])));
    const maxX = Math.min(canvas.width, Math.max(...barcodeCoordinates.map(p => p[0])));
    const minY = Math.max(0, Math.min(...barcodeCoordinates.map(p => p[1])));
    const maxY = Math.min(canvas.height, Math.max(...barcodeCoordinates.map(p => p[1])));

    const barcodeHeight = Math.max(1, maxY - minY);
    const barcodeWidth = Math.max(1, maxX - minX);

    // Signature detection parameters
    const scanOptions = {
        pixelThreshold: 200,
        minDensity: 0.03,
        minStrokeDensity: 0.005,
        minSignatureWidth: 30,
        minBlocks: 2,
        maxTextLikeDensity: 0.08,
        minStrokeVariation: 0.3
    };

    // Calculate signature search area based on barcode position
    const signatureAreaWidth = Math.min(
        canvas.width * 1,
        Math.max(barcodeWidth * 2, 450)
    );

    const signatureAreaX = Math.min(
        canvas.width - signatureAreaWidth,
        Math.max(0, maxX + (barcodeWidth * 0.7))
    );

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

    if (signatureAreaWidth <= 0 || signatureAreaHeight <= 0) {
        console.warn("⚠️ Invalid signature area dimensions");
        return { detected: false };
    }

    // Create canvas for signature area analysis
    const signatureCanvas = document.createElement('canvas');
    signatureCanvas.width = Math.max(1, Math.floor(signatureAreaWidth));
    signatureCanvas.height = Math.max(1, Math.floor(signatureAreaHeight));
    const signatureCtx = signatureCanvas.getContext('2d');

    try {
        // Extract signature area from main canvas
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

        // Analyze the extracted area for signature characteristics
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
 * Analyzes an image area for signature characteristics
 * @param {ImageData} imageData - Pixel data of the area to analyze
 * @param {number} width - Width of the area
 * @param {number} height - Height of the area
 * @param {Object} options - Detection parameters
 * @returns {Object} Analysis results with detection confidence
 */
function analyzeSignatureArea(imageData, width, height, options) {
    const opts = options || {
        pixelThreshold: 120,
        minDensity: 0.03,
        minStrokeDensity: 0.01,
        minSignatureWidth: 30,
        minBlocks: 2
    };

    let darkPixels = 0; // Count of dark pixels
    let strokeTransitions = 0; // Count of light-to-dark transitions
    let prevDark = false; // Previous pixel state
    let currentBlockLength = 0; // Current continuous dark pixel block length
    let potentialBlocks = 0; // Count of potential signature strokes
    let maxBlockLength = 0; // Length of longest continuous dark pixel block

    // Analyze each pixel in the image data
    for (let i = 0; i < imageData.data.length; i += 4) {
        // Calculate pixel brightness (average of RGB)
        const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        const isDark = brightness < opts.pixelThreshold;

        if (isDark) {
            darkPixels++;
            if (!prevDark) strokeTransitions++;
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

    // Check for final block
    if (currentBlockLength >= opts.minSignatureWidth) {
        potentialBlocks++;
        maxBlockLength = Math.max(maxBlockLength, currentBlockLength);
    }

    const totalPixels = width * height;
    const pixelDensity = darkPixels / totalPixels; // Ratio of dark pixels
    const strokeDensity = strokeTransitions / totalPixels; // Ratio of transitions

    // Determine if signature is detected based on thresholds
    const detected = (
        (pixelDensity >= opts.minDensity) &&
        (strokeDensity >= opts.minStrokeDensity) &&
        (potentialBlocks >= opts.minBlocks || maxBlockLength >= opts.minSignatureWidth * 3)
    );

    // Calculate confidence score (0-100)
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

/**
 * Updates the progress bar and text in the UI
 * @param {number} percent - Completion percentage (0-100)
 * @param {string} text - Status text to display
 */
function updateProgress(percent, text) {
    progressBar.style.transition = 'width 0.3s ease';
    progressBar.style.width = `${percent}%`;
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

// Event listeners for export options modal
document.getElementById('exportOptionsCancel').addEventListener('click', function() {
    const modal = document.getElementById('exportOptionsModal');
    modal.classList.remove('show');
    
    // Wait for the animation to complete before hiding
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300); // Match this duration with your CSS transition time
});

document.getElementById('exportOptionsConfirm')?.addEventListener('click', () => {
    const selectedFilter = document.querySelector('input[name="exportFilter"]:checked').value;
    hideExportOptionsModal();
    exportResultsWithFilter(selectedFilter);
});

/**
 * Shows the export options modal with animation
 */
function showExportOptionsModal() {
    const modal = document.getElementById('exportOptionsModal');
    modal.classList.remove('hidden');
    // Trigger the animation by adding 'show' after a small delay
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

/**
 * Hides the export options modal with animation
 */
function hideExportOptionsModal() {
    const modal = document.getElementById('exportOptionsModal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

/**
 * Exports the scan results with optional filtering
 */
function exportResults() {
    if (allBarcodeResults.length === 0 && resultsBody.children.length === 0) {
        showError('No results to export');
        return;
    }
    
    showExportOptionsModal();
}

/**
 * Exports results with the specified filter applied
 * @param {string} filterType - Type of filter to apply ('all', 'hasSignature', 'noSignature')
 */
function exportResultsWithFilter(filterType) {
    showExportModal();

    setTimeout(() => {
        const firstFileName = filesToProcess.length > 0 ? 
            filesToProcess[0].name.replace(/\.[^/.]+$/, "") : "scan_results";

        // Filter results based on selection
        let filteredResults = allBarcodeResults;
        let filterLabel = "all_barcodes"; // Default label
        
        if (filterType === 'hasSignature') {
            filteredResults = allBarcodeResults.filter(b => b.hasSignature);
            filterLabel = "barcodes_with_signature";
        } else if (filterType === 'noSignature') {
            filteredResults = allBarcodeResults.filter(b => !b.hasSignature);
            filterLabel = "barcodes_without_signature";
        }

        if (filteredResults.length === 0) {
            hideExportModal();
            showError(`No barcodes found matching the selected filter (${filterType}).`);
            return;
        }

        // Generate CSV content
        let csvContent = "Barcode,Signature\n";
        filteredResults.forEach(barcode => {
            csvContent += `"${barcode.code}",` + 
                          `"${barcode.hasSignature ? '1' : '0'}"\n`;
        });

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${firstFileName}_${filterType}_results.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(hideExportModal, 500);
    }, 1000);
}

/**
 * Clears all scan results and resets the UI
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

// Modal control functions

/**
 * Shows the "no files selected" modal
 */
function showNoFilesModal() {
    const modal = document.getElementById('noFilesModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the "no files selected" modal
 */
function hideNoFilesModal() {
    const modal = document.getElementById('noFilesModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

/**
 * Shows the loading indicator
 */
function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the loading indicator
 */
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.remove('show');
    document.body.style.overflow = 'auto';
}

/**
 * Shows the progress modal
 */
function showProgressModal() {
    const modal = document.getElementById('progressModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Hides the progress modal
 */
function hideProgressModal() {
    const modal = document.getElementById('progressModal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

/**
 * Shows the export modal
 */
function showExportModal() {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Hides the export modal
 */
function hideExportModal() {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

/**
 * Shows the clearing in progress modal
 */
function showClearingModal() {
    const modal = document.getElementById('clearingModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the clearing in progress modal
 */
function hideClearingModal() {
    const modal = document.getElementById('clearingModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

/**
 * Shows the clear success modal
 */
function showClearSuccessModal() {
    const modal = document.getElementById('clearSuccessModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the clear success modal
 */
function hideClearSuccessModal() {
    const modal = document.getElementById('clearSuccessModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

/**
 * Shows the confirm clear modal
 */
function showConfirmClearModal() {
    const modal = document.getElementById('confirmClearModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the confirm clear modal
 */
function hideConfirmClearModal() {
    const modal = document.getElementById('confirmClearModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

// Event listeners for modal buttons
document.getElementById('noFilesModalClose')?.addEventListener('click', hideNoFilesModal);
document.getElementById('confirmClearCancel')?.addEventListener('click', hideConfirmClearModal);
document.getElementById('confirmClearConfirm')?.addEventListener('click', () => {
    hideConfirmClearModal();
    showClearingModal();
    setTimeout(() => {
        clearResults();
        hideClearingModal();
        showClearSuccessModal();
    }, 3000);
});
document.getElementById('clearSuccessOk')?.addEventListener('click', hideClearSuccessModal);

// Main event listeners
scanBtn.addEventListener('click', processFiles);
exportBtn.addEventListener('click', exportResults);
clearResultsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showConfirmClearModal();
});

/**
 * Initializes the application on load
 * @async
 */
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

window.addEventListener('DOMContentLoaded', initializeAll);

/**
 * Handles responsive layout changes
 */
function handleResponsiveChanges() {
    if (window.innerWidth < 768) {
        // Mobile-specific adjustments can be made here
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
    }
}

window.addEventListener('resize', handleResponsiveChanges);
window.addEventListener('DOMContentLoaded', () => {
    initializeAll();
    handleResponsiveChanges(); // Run once on load
});