// DOM Elements
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
const processingCanvas = document.getElementById('processingCanvas');
const processingCtx = processingCanvas.getContext('2d');
const result = document.getElementById('result');

const loadingIndicator = document.getElementById('loadingIndicator');
const loadingProgress = document.getElementById('loadingProgress');

// State
let filesToProcess = [];
let allBarcodeResults = [];
let signatureModel;
let isModelLoaded = false;
let reader = null;
let cvReady = false;

async function initializeDynamsoft() {
    try {
        // Initialize the barcode reader
        reader = await Dynamsoft.DBR.BarcodeReader.createInstance();
        
        // CORRECTED: Use the proper method to update settings
        let settings = await reader.getRuntimeSettings();
        
        // // Remove regional scanning restriction
        // delete settings.region; 

        // Configure settings for Code 39 priority
        // settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39;
        // settings.deblurLevel = 6;
        // settings.expectedBarcodesCount = 0;
        settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39;
        settings.minResultConfidence = 0; 
        
        // Apply the updated settings
        await reader.updateRuntimeSettings(settings);
        
        console.log("Dynamsoft Barcode Reader initialized successfully");
    } catch (ex) {
        console.error("Initialization failed:", ex);
        throw ex;
    }
}

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

scanBtn.addEventListener('click', processFiles);
exportBtn.addEventListener('click', exportResults);
clearResultsBtn.addEventListener('click', clearResults);

async function initializeAll() {
    loadingIndicator.classList.remove('hidden');
    
    try {
        loadingProgress.textContent = 'Initializing barcode scanner...';
        await initializeDynamsoft();
        
        loadingProgress.textContent = 'Ready to scan!';
        setTimeout(() => loadingIndicator.classList.add('hidden'), 1000);
    } catch (error) {
        console.error("Initialization error:", error);
        loadingProgress.textContent = `Error: ${error.message}`;
        showError("Initialization failed. Please refresh the page.");
    }
}

 // Call this when the page loads
 window.addEventListener('DOMContentLoaded', initializeAll);

// Functions
function handleFiles(files) {
    errorMessage.classList.add('hidden');
    filesToProcess = [];
    fileList.innerHTML = '';
    
    const validFiles = Array.from(files).filter(file => {
        const isValidType = file.type.match('image.*') || file.type === 'application/pdf';
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        
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

async function processFiles() {
    try {
        // Initialize Dynamsoft if not already done
        if (!reader) await initializeDynamsoft();
        if (filesToProcess.length === 0) return;

        // Reset state
        allBarcodeResults = [];
        resultsBody.innerHTML = '';
        progressContainer.classList.remove('hidden');
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

    } catch (error) {
        console.error("Processing failed:", error);
        showError("Failed to initialize barcode scanner. Please refresh the page.");
        scanBtn.disabled = false;
        progressContainer.classList.add('hidden');
    }
}

// // Temporary function to show the canvas for debugging
// function debugShowPage(canvas) {
//     try {
//         // Create a preview div if it doesn't exist
//         let debugDiv = document.getElementById('debugPreview');
//         if (!debugDiv) {
//             debugDiv = document.createElement('div');
//             debugDiv.id = 'debugPreview';
//             debugDiv.style.position = 'fixed';
//             debugDiv.style.bottom = '20px';
//             debugDiv.style.right = '20px';
//             debugDiv.style.zIndex = '1000';
//             debugDiv.style.backgroundColor = 'white';
//             debugDiv.style.padding = '10px';
//             debugDiv.style.border = '1px solid #ccc';
//             debugDiv.style.maxHeight = '300px';
//             debugDiv.style.overflow = 'auto';
//             document.body.appendChild(debugDiv);
//         }
        
//         // Add the canvas image to the div
//         const img = document.createElement('img');
//         img.src = canvas.toDataURL();
//         img.style.maxWidth = '200px';
//         debugDiv.appendChild(img);
//     } catch (error) {
//         console.error('Debug preview error:', error);
//     }
// }

// Function to process PDF files with Dynamsoft
async function processPDFWithDynamsoft(file) {
    const result = {
        barcodes: [],
        signature: false,
        error: null,
        fileType: file.type,
        fileName: file.name
    };

    try {
        // Load the PDF.js library
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        
        // Create a FileReader to read the file content
        const fileReader = new FileReader();
        
        // Read the PDF file as an ArrayBuffer
        const pdfData = await new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(file);
        });
        
        // Load the PDF document
        const pdfDoc = await pdfjsLib.getDocument({data: pdfData}).promise;
        const numPages = pdfDoc.numPages;

        // Process each page of the PDF
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            updateProgress(((pageNum - 1) / numPages) * 100, `Processing page ${pageNum} of ${numPages} in ${file.name}`);
                        
            // Get the page
            const page = await pdfDoc.getPage(pageNum);
            
            // Create a canvas for rendering the PDF page
            const viewport = page.getViewport({scale: 3.0});
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Render the PDF page on the canvas
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            if (!reader) await initializeDynamsoft();
            
            // Convert canvas to blob URL for Dynamsoft to process
            const dataUrl = canvas.toDataURL('image/jpeg', 0.99);
            const barcodeResults = await reader.decode(dataUrl);
            
            // Process each barcode found on this page
            for (const barcode of barcodeResults) {
                const points = barcode.localizationResult?.resultPoints || [];
                
                // Calculate center point for sorting
                const centerX = points.length > 0 ? points.reduce((sum, p) => sum + p[0], 0) / points.length : 0;
                const centerY = points.length > 0 ? points.reduce((sum, p) => sum + p[1], 0) / points.length : 0;
                
                // Detect signature for this specific barcode
                const hasSignature = await detectSignature(canvas, points);
                
                result.barcodes.push({
                    code: barcode.barcodeText,
                    format: barcode.barcodeFormatString,
                    confidence: barcode.localizationResult?.confidence || 0,
                    coordinates: points,
                    centerX,
                    centerY,
                    hasSignature,
                    visualization: createDynamsoftBarcodeVisualization(canvas, {
                        coordinates: points,
                        format: barcode.barcodeFormatString,
                        code: barcode.barcodeText,
                        confidence: barcode.localizationResult?.confidence || 0,
                        hasSignature
                    }),
                    page: pageNum,
                    hasSignature
                });
                
                // Set document-level signature flag if any barcode has a signature
                if (hasSignature) {
                    result.signature = true;
                }
            }
        }
        
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
        
    } catch (error) {
        result.error = error.message;
        console.error("Error processing PDF:", error);
    }
    
    return result;
}

// Function to detect barcodes in PDF files using region detection
async function processPDFWithRegionDetection(file) {
    // Clone the original result structure
    const result = await processPDFWithDynamsoft(file);
    
    // If no barcodes were found or there's an error, perform region-based detection
    if (result.barcodes.length === 0 && !result.error) {
        try {
            // Load the PDF.js library
            const pdfjsLib = window.pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
            
            // Create a FileReader to read the file content
            const fileReader = new FileReader();
            
            // Read the PDF file as an ArrayBuffer
            const pdfData = await new Promise((resolve, reject) => {
                fileReader.onload = () => resolve(fileReader.result);
                fileReader.onerror = reject;
                fileReader.readAsArrayBuffer(file);
            });
            
            // Load the PDF document
            const pdfDoc = await pdfjsLib.getDocument({data: pdfData}).promise;
            const numPages = pdfDoc.numPages;
            
            // Update progress to indicate region detection
            updateProgress(0, `No barcodes found. Starting region detection in ${file.name}`);
            
            // Process each page of the PDF with region detection
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                updateProgress(((pageNum - 1) / numPages) * 100, 
                    `Performing region detection on page ${pageNum} of ${numPages} in ${file.name}`);
                
                // Get the page
                const page = await pdfDoc.getPage(pageNum);
                
                // Create a canvas for rendering the PDF page with higher resolution
                const viewport = page.getViewport({scale: 3.0}); // Increased scale for better detection
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                // Render the PDF page on the canvas
                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;
                
                // Define regions to scan (common areas where barcodes might be found)
                const regions = [
                    // Entire page
                    {x: 0, y: 0, width: canvas.width, height: canvas.height},
                    // Top region (expanded)
                    {x: 0, y: 0, width: canvas.width, height: canvas.height * 0.3},
                    // Bottom region (expanded)
                    {x: 0, y: canvas.height * 0.7, width: canvas.width, height: canvas.height * 0.3},
                    // Left side region
                    {x: 0, y: 0, width: canvas.width * 0.3, height: canvas.height},
                    // Right side region
                    {x: canvas.width * 0.7, y: 0, width: canvas.width * 0.3, height: canvas.height},
                    // Center regions (multiple)
                    {x: canvas.width * 0.2, y: canvas.height * 0.2, width: canvas.width * 0.6, height: canvas.height * 0.6},
                    {x: canvas.width * 0.3, y: canvas.height * 0.3, width: canvas.width * 0.4, height: canvas.height * 0.4}
                ];

                // Scan the entire page
                regions.unshift({
                    x: 0, 
                    y: 0, 
                    width: canvas.width, 
                    height: canvas.height
                });

                // Apply different processing techniques for each region
                for (let i = 0; i < regions.length; i++) {
                    const region = regions[i];
                    
                    // Create a canvas for the region
                    const regionCanvas = document.createElement('canvas');
                    regionCanvas.width = region.width;
                    regionCanvas.height = region.height;
                    const regionCtx = regionCanvas.getContext('2d', { willReadFrequently: true });
                    
                    // Draw the region onto the new canvas
                    regionCtx.drawImage(
                        canvas, 
                        region.x, region.y, region.width, region.height,
                        0, 0, region.width, region.height
                    );
                    
                    // Apply image processing to enhance barcode visibility
                    await enhanceRegionForBarcodeDetection(regionCanvas);
                    
                    // Scan the enhanced region for barcodes
                    if (!reader) await initializeDynamsoft();
                    
                    // Update runtime settings to be more sensitive for region detection
                    let settings = await reader.getRuntimeSettings();
                    settings.expectedBarcodesCount = 512; // Increase expected barcode count
                    settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39 | Dynamsoft.DBR.EnumBarcodeFormat.BF_ALL;
                    settings.deblurLevel = 9; // Maximum deblur level
                    settings.scaleDownThreshold = 3000; // Allow processing larger images
                    settings.timeout = 20000; // Increase timeout
                    await reader.updateRuntimeSettings(settings);
                    
                    // Scan the region
                    const regionUrl = regionCanvas.toDataURL('image/jpeg', 0.99);
                    const regionResults = await reader.decode(regionUrl);
                    
                    // // Reset reader settings after scanning
                    // await reader.resetRuntimeSettings();
                    // settings = await reader.getRuntimeSettings();
                    // settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39 | Dynamsoft.DBR.EnumBarcodeFormat.BF_ALL;
                    // settings.deblurLevel = 9;
                    // settings.expectedBarcodesCount = 0;
                    // await reader.updateRuntimeSettings(settings);
                    const { detected } = await detectSignature(canvas, points);
                    const hasSignature = detected;

                    // Convert region coordinates to full page coordinates
                    const regionBarcodes = regionResults.map(b => {
                        const points = b.localizationResult?.resultPoints || [];
                                          
                        return {
                            code: b.barcodeText,
                            format: b.barcodeFormatString,
                            confidence: b.localizationResult?.confidence || 0,
                            coordinates: adjustedPoints,
                            centerX,
                            centerY,
                            hasSignature, // Correctly set from detection
                            visualization: createDynamsoftBarcodeVisualization(canvas, {
                                coordinates: adjustedPoints,
                                format: b.barcodeFormatString,
                                code: b.barcodeText,
                                confidence: b.localizationResult?.confidence || 0,
                                hasSignature
                            }),
                            page: pageNum,
                            detectionMethod: 'region',
                            regionIndex: i
                        };
                    });
                    
                    // Add barcodes found in this region
                    result.barcodes.push(...regionBarcodes);
                }
            }
            
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
            
            // Remove duplicates (same barcode detected in multiple regions)
            result.barcodes = removeDuplicateBarcodes(result.barcodes);
            
        } catch (error) {
            console.error("Error in region detection:", error);
            // Don't update the error if we already have results from the primary method
            if (result.barcodes.length === 0) {
                result.error = "Region detection failed: " + error.message;
            }
        }
    }
    
    return result;
}

// Function to enhance image regions for better barcode detection
async function enhanceRegionForBarcodeDetection(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply simple threshold/binarization
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const newValue = avg > 128 ? 255 : 0; // Binarization for high contrast
        
        data[i] = newValue;     // Red
        data[i + 1] = newValue; // Green
        data[i + 2] = newValue; // Blue
    }
    
     // Apply the processed image data back to the canvas
     ctx.putImageData(imageData, 0, 0);
     return canvas;
 }

// Function to remove duplicate barcodes
function removeDuplicateBarcodes(barcodes) {
    const uniqueBarcodes = [];
    const seenCodes = new Set();
    
    for (const barcode of barcodes) {
        // Create a unique key combining barcode value and page
        const key = `${barcode.code}_${barcode.page}`;
        
        if (!seenCodes.has(key)) {
            seenCodes.add(key);
            uniqueBarcodes.push(barcode);
        } else {
            // If we've seen this barcode before, keep the one with higher confidence
            const existingIndex = uniqueBarcodes.findIndex(b => 
                b.code === barcode.code && b.page === barcode.page);
            
            if (existingIndex >= 0 && barcode.confidence > uniqueBarcodes[existingIndex].confidence) {
                uniqueBarcodes[existingIndex] = barcode;
            }
        }
    }
    
    return uniqueBarcodes;
}

// Function to process Image files with Dynamsoft 
async function processImageWithDynamsoft(file) {
    const result = {
        barcodes: [], // This will maintain the original order
        signature: false,
        error: null,
        fileType: file.type,
        fileName: file.name
    };

    try {
        const imageUrl = URL.createObjectURL(file);
        if (!reader) await initializeDynamsoft();
        
        // Get barcodes in detection order (no sorting applied)
        const barcodeResults = await reader.decode(imageUrl);

        // Create canvas from file first - important fix here
        const canvas = await createCanvasFromFile(file);
        
        // Process each barcode and detect signature near it
        for (const barcode of barcodeResults) {
            const points = barcode.localizationResult?.resultPoints || [];
            const centerX = points.length > 0 ? points.reduce((sum, p) => sum + p[0], 0) / points.length : 0;
            const centerY = points.length > 0 ? points.reduce((sum, p) => sum + p[1], 0) / points.length : 0;
            
            // Detect signature for this specific barcode
            const { detected } = await detectSignature(canvas, points); // Destructure the result
            const hasSignature = detected;
            
            result.barcodes.push({
                code: barcode.barcodeText,
                format: barcode.barcodeFormatString,
                confidence: barcode.localizationResult?.confidence || 0,
                coordinates: points,
                centerX,
                centerY,
                hasSignature, // Now properly set from detection result
                visualization: createDynamsoftBarcodeVisualization(canvas, {
                    coordinates: points,
                    format: barcode.barcodeFormatString,
                    code: barcode.barcodeText,
                    confidence: barcode.localizationResult?.confidence || 0,
                    hasSignature
                }),
            });
            
            // // Set document-level signature flag if any barcode has a signature
            // if (hasSignature) {
            //     result.signature = true;
            // }
        }
        
        URL.revokeObjectURL(imageUrl);

        // Sort barcodes by position (top to bottom, then left to right)
        result.barcodes.sort((a, b) => {
            // Define a threshold for considering barcodes to be on the same "row"
            const rowThreshold = 30; // pixels
            
            // If barcodes are roughly on the same horizontal line, sort by X
            if (Math.abs(a.centerY - b.centerY) < rowThreshold) {
                return a.centerX - b.centerX; // Left to right
            }
            
            // Otherwise sort by Y coordinate
            return a.centerY - b.centerY; // Top to bottom
        });
        
        // Rest of the processing remains unchanged
        for (const barcode of result.barcodes) {
            barcode.visualization = createDynamsoftBarcodeVisualization(canvas, barcode);
        }
        result.signature = await detectSignature(canvas);
        
    } catch (error) {
        result.error = error.message;
        console.error("Error processing image:", error);
    }
    
    return result; // Returns barcodes in original detection order
}

async function createCanvasFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(img.src); // Add this line
            resolve(canvas);
        };
        img.onerror = reject; // Add error handling
        img.src = URL.createObjectURL(file);
    });
}

function sortBarcodes(barcodes) {
    return barcodes.sort((a, b) => {
        // First sort by page number if available
        if (a.page !== undefined && b.page !== undefined && a.page !== b.page) {
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
}

// Function to create a visual overlay of detected barcodes
function createDynamsoftBarcodeVisualization(canvas, barcode) {
    const visualCanvas = document.createElement('canvas');
    visualCanvas.width = canvas.width;
    visualCanvas.height = canvas.height;
    const ctx = visualCanvas.getContext('2d', { willReadFrequently: true });
    
    // Draw original image
    ctx.drawImage(canvas, 0, 0);

    // Add null checks
    if (!barcode.coordinates || barcode.coordinates.length < 4) {
        return canvas.toDataURL(); // Return original if invalid
    }
    
    // Draw bounding box around barcode
    if (barcode.coordinates && barcode.coordinates.length >= 4) {
        const points = barcode.coordinates;

        // Calculate barcode boundaries
        const minX = Math.min(...points.map(p => p[0]));
        const maxX = Math.max(...points.map(p => p[0]));
        const minY = Math.min(...points.map(p => p[1]));
        const maxY = Math.max(...points.map(p => p[1]));

        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw signature detection area
        const signatureWidth = Math.min((maxX - minX) * 2, canvas.width - maxX);
        const signatureHeight = (maxY - minY) * 1.5;

        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            searchStartX,
            rowStartY,
            signatureWidth,
            signatureHeight
        )
        
        // Add barcode labe
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(minX, minY - 20, 240, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(`${barcode.format}: ${barcode.code.substring(0, 20)}...`, 
                    minX + 5, minY - 5);

        // Add signature indicator
        ctx.fillStyle = barcode.hasSignature ? 'rgba(0, 150, 0, 0.8)' : 'rgba(200, 0, 0, 0.8)';
        ctx.fillRect(minX, minY - 40, 120, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Signature: ${barcode.hasSignature ? 'YES' : 'NO'}`, 
                    minX + 5, minY - 25);
    }
    
    return visualCanvas.toDataURL();
}

async function processCanvas(canvas, result, sourceInfo) {
    // Scan for barcodes
    const barcodeResults = await scanBarcodesOnCanvas(canvas);
    if (barcodeResults.length > 0) {
        result.barcodes.push(...barcodeResults.map(b => ({
            ...b,
            source: sourceInfo
        })));
        allBarcodeResults.push(...barcodeResults.map(b => ({
            ...b,
            fileName: result.fileName,
            source: sourceInfo
        })));
    }
    
    // Detect signature
    if (!result.signature) {
        result.signature = await detectSignature(canvas);
    }
}

async function detectSignature(canvas, barcodeCoordinates) {
    if (!barcodeCoordinates || barcodeCoordinates.length < 4) {
        return {
            detected: false,
        };
    }

    try {
        // Calculate barcode boundaries
        const minX = Math.min(...barcodeCoordinates.map(p => p[0]));
        const maxX = Math.max(...barcodeCoordinates.map(p => p[0]));
        const minY = Math.min(...barcodeCoordinates.map(p => p[1]));
        const maxY = Math.max(...barcodeCoordinates.map(p => p[1]));

        // Calculate row height (1.5x barcode height for padding)
        const barcodeHeight = maxY - minY;
        const rowStartY = Math.max(0, minY - barcodeHeight * 0.25);
        const rowEndY = Math.min(canvas.height, maxY + barcodeHeight * 0.25);

        // Define search area - entire row width after barcode
        const searchStartX = maxX + 10; // 10px right of barcode
        const searchStartY = rowStartY;
        const signatureWidth = canvas.width - searchStartX;
        const signatureHeight = rowEndY - rowStartY;

        // Ensure valid dimensions
        if (signatureWidth <= 0 || signatureHeight < 5) {
            return { detected: false };
        }

        // Extract row region
        const regionCanvas = document.createElement('canvas');
        regionCanvas.width = signatureWidth;
        regionCanvas.height = signatureHeight;
        const ctx = regionCanvas.getContext('2d');
        ctx.drawImage(
            canvas,
            searchStartX, searchStartY, signatureWidth, signatureHeight,
            0, 0, signatureWidth, signatureHeight
        );

        // Analyze the specific region
        const imageData = ctx.getImageData(0, 0, signatureWidth, signatureHeight);
    const detected = analyzeSignatureRow(imageData.data, signatureWidth); // Get boolean result
    return { detected: Boolean(detected) }; // Force boolean conversion
    } catch (error) {
        console.error('Signature detection error:', error);
        return { detected: false };
    }
}

function analyzeSignatureArea(imageData, width) {
    let signaturePixels = 0;
    let strokeTransitions = 0;
    const height = imageData.length / (width * 4);
    const intensityThreshold = 100; // Darker pixels only
    let verticalDensity = 0;

    // Scan vertically through columns
    for (let x = 0; x < width; x++) {
        let columnStrokes = 0;
        let prevDark = false;
        
        for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 4;
            const brightness = (imageData[idx] + imageData[idx+1] + imageData[idx+2]) / 3;
            
            if (brightness < intensityThreshold) {
                signaturePixels++;
                if (!prevDark) columnStrokes++;
                prevDark = true;
            } else {
                prevDark = false;
            }
        }
        
        if (columnStroches > 2) verticalDensity++; // Columns with multiple strokes
    }
    
    // Add validation
    const isValidDetection = (
        verticalDensityRatio > 0.15 &&
        pixelDensity > 0.05 &&
        pixelDensity < 0.4
    );
    
    // Add sanity checks
    if (width < 10 || height < 10) return false; // Minimum signature area
    if (signaturePixels < 50) return false; // Minimum dark pixels
    
    return isValidDetection;
}

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

function exportResults() {
    if (allBarcodeResults.length === 0 && resultsBody.children.length === 0) {
        showError('No results to export');
        return;
    }
    
    let csvContent = "File Name,File Type,Barcode Type,Barcode Value,Signature Found,Status,Time\n";
    
    // Get all rows from results table
    const rows = Array.from(resultsBody.querySelectorAll('tr'));
    
    rows.forEach(row => {
        const filename = row.dataset.filename;
        const cells = row.querySelectorAll('td');
        
        const fileType = cells[0].querySelector('div:nth-child(2)').textContent;
        const barcodeCount = cells[1].textContent.includes('found') ? 
            cells[1].querySelector('span').textContent.replace(' found', '') : '0';
        const signature = cells[2].querySelector('span').textContent;
        const status = cells[3].querySelector('span').textContent;
        const time = new Date().toLocaleString();
        
        // Get barcodes for this file
        const fileBarcodes = allBarcodeResults.filter(b => b.fileName === filename);
        
        if (fileBarcodes.length > 0) {
            fileBarcodes.forEach(barcode => {
                csvContent += `"${filename}","${fileType}","${barcode.format || 'Unknown'}","${barcode.code}","${signature}","${status}","${time}"\n`;
            });
        } else {
            csvContent += `"${filename}","${fileType}","","","${signature}","${status}","${time}"\n`;
        }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `barcode_scan_results_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearResults() {
    filesToProcess = [];
    allBarcodeResults = [];
    fileList.innerHTML = '';
    resultsBody.innerHTML = '';
    barcodeDetails.classList.add('hidden');
    resultsSection.classList.add('hidden');
    fileInput.value = '';
}