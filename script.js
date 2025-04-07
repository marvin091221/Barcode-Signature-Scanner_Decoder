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
        
        // Configure settings for Code 39 priority
        settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39;
        settings.deblurLevel = 6;
        settings.expectedBarcodesCount = 0;
        
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
        // loadingProgress.textContent = 'Loading OpenCV...';
        // await cvLoadPromise;
        
        loadingProgress.textContent = 'Initializing barcode scanner...';
        await initializeDynamsoft();

        // loadingProgress.textContent = 'Loading signature model...';
        // await loadSignatureModel();
        
        loadingProgress.textContent = 'Ready to scan!';
        setTimeout(() => loadingIndicator.classList.add('hidden'), 1000);
    } catch (error) {
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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    ${file.type === 'application/pdf' ? 
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />' :
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />'}
                </svg>
                <span class="text-gray-700">${file.name}</span>
            </div>
            <span class="text-sm text-gray-500 ml-5">${formatFileSize(file.size)}</span>
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
                } else {
                    result = await processImageWithDynamsoft(file);
                }
                // Add to results table
                addResultToTable(file.name, result);
                
                // Store all barcode results for export
                allBarcodeResults.push(...result.barcodes.map(b => ({
                    ...b,
                    fileName: file.name
                })));

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
            const viewport = page.getViewport({scale: 5.0});

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Improve rendering quality
            ctx.imageSmoothingEnabled = false;
            
            // Render the PDF page on the canvas
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // // Debugging line to show the rendered page
            // debugShowPage(canvas); 
            
            // Process the rendered page
            if (!reader) await initializeDynamsoft();
            
            // Convert canvas to blob URL for Dynamsoft to process
            const dataUrl = canvas.toDataURL('image/jpeg', 0.99);
            const barcodeResults = await reader.decode(dataUrl);
            
            // Map barcode results similar to processImageWithDynamsoft
            const pageBarcodes = barcodeResults.map(b => {
                const points = b.localizationResult?.resultPoints || [];
                
                // Calculate center point for sorting
                const centerX = points.length > 0 ? points.reduce((sum, p) => sum + p[0], 0) / points.length : 0;
                const centerY = points.length > 0 ? points.reduce((sum, p) => sum + p[1], 0) / points.length : 0;
                
                return {
                    code: b.barcodeText,
                    format: b.barcodeFormatString,
                    confidence: b.localizationResult?.confidence || 0,
                    coordinates: points,
                    centerX,
                    centerY,
                    visualization: createDynamsoftBarcodeVisualization(canvas, {
                        coordinates: points,
                        format: b.barcodeFormatString,
                        code: b.barcodeText,
                        confidence: b.localizationResult?.confidence || 0
                    }),
                    page: pageNum
                };
            });
            
            // Add barcodes from this page to the result
            result.barcodes.push(...pageBarcodes);
            result.signature = result.signature || await detectSignature(canvas);
            
            // Check for signature on this page
            const hasSignature = await detectSignature(canvas);
            if (hasSignature) {
                result.signature = true;
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
                const viewport = page.getViewport({scale: 5.0}); // Increased scale for better detection
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                // Render the PDF page on the canvas
                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                // Scan the entire page
                regions.unshift({
                    x: 0, 
                    y: 0, 
                    width: canvas.width, 
                    height: canvas.height
                });
                
                // Define regions to scan (common areas where barcodes might be found)
                const regions = [
                    // Top region (expanded)
                    {x: 0, y: 0, width: canvas.width, height: canvas.height * 0.9},
                    // Bottom region (expanded)
                    {x: 0, y: canvas.height * 0.7, width: canvas.width, height: canvas.height * 0.9},
                    // Left side region
                    {x: 0, y: 0, width: canvas.width * 0.9, height: canvas.height},
                    // Right side region
                    {x: canvas.width * 0.7, y: 0, width: canvas.width * 0.6, height: canvas.height},
                    // Center regions (multiple)
                    {x: canvas.width * 0.2, y: canvas.height * 0.2, width: canvas.width * 0.9, height: canvas.height * 0.9},
                    {x: canvas.width * 0.3, y: canvas.height * 0.3, width: canvas.width * 0.7, height: canvas.height * 0.7}
                ];
                
                // Apply different processing techniques for each region
                for (let i = 0; i < regions.length; i++) {
                    const region = regions[i];
                    
                    // Create a canvas for the region
                    const regionCanvas = document.createElement('canvas');
                    regionCanvas.width = region.width;
                    regionCanvas.height = region.height;
                    const regionCtx = regionCanvas.getContext('2d');
                    
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
                    
                    // Reset reader settings after scanning
                    await reader.resetRuntimeSettings();
                    settings = await reader.getRuntimeSettings();
                    settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39 | Dynamsoft.DBR.EnumBarcodeFormat.BF_ALL;
                    settings.deblurLevel = 9;
                    settings.expectedBarcodesCount = 0;
                    await reader.updateRuntimeSettings(settings);
                    
                    // Convert region coordinates to full page coordinates
                    const regionBarcodes = regionResults.map(b => {
                        const points = b.localizationResult?.resultPoints || [];
                        
                        // Adjust coordinates to main canvas
                        const adjustedPoints = points.map(point => {
                            return [point[0] + region.x, point[1] + region.y];
                        });
                        
                        // Calculate center point
                        const centerX = adjustedPoints.length > 0 ? 
                            adjustedPoints.reduce((sum, p) => sum + p[0], 0) / adjustedPoints.length : 0;
                        const centerY = adjustedPoints.length > 0 ? 
                            adjustedPoints.reduce((sum, p) => sum + p[1], 0) / adjustedPoints.length : 0;
                        
                        return {
                            code: b.barcodeText,
                            format: b.barcodeFormatString,
                            confidence: b.localizationResult?.confidence || 0,
                            coordinates: adjustedPoints,
                            centerX,
                            centerY,
                            visualization: createDynamsoftBarcodeVisualization(canvas, {
                                coordinates: adjustedPoints,
                                format: b.barcodeFormatString,
                                code: b.barcodeText,
                                confidence: b.localizationResult?.confidence || 0
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
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply multiple image processing techniques
    
    // 1. Increase contrast
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const newValue = avg > 128 ? 255 : 0; // Binarization for high contrast
        
        data[i] = newValue;     // Red
        data[i + 1] = newValue; // Green
        data[i + 2] = newValue; // Blue
    }
    
    // 2. Apply sharpening filter
    const original = new Uint8ClampedArray(data);
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    // Skip edges to avoid index out of bounds
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const pixelIndex = (y * canvas.width + x) * 4;
            
            for (let channel = 0; channel < 3; channel++) { // Only apply to RGB channels
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const kernelIndex = (ky + 1) * 3 + (kx + 1);
                        const sourceIndex = pixelIndex + (ky * canvas.width + kx) * 4 + channel;
                        
                        sum += original[sourceIndex] * kernel[kernelIndex];
                    }
                }
                
                // Clamp the value to 0-255
                data[pixelIndex + channel] = Math.max(0, Math.min(255, sum));
            }
        }
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
        
        // Preserve the original order by directly mapping results
        result.barcodes = barcodeResults.map(b => {
            const points = b.localizationResult?.resultPoints || [];
            
            // // Calculate center point for sorting
            const centerX = points.length > 0 ? points.reduce((sum, p) => sum + p[0], 0) / points.length : 0;
            const centerY = points.length > 0 ? points.reduce((sum, p) => sum + p[1], 0) / points.length : 0;
            
            return {
                code: b.barcodeText,
                format: b.barcodeFormatString,
                confidence: b.localizationResult?.confidence || 0,
                coordinates: points,
                centerX,
                centerY,
                visualization: null
            };
        });
        
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
        const canvas = await createCanvasFromFile(file);
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
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            resolve(canvas);
        };
        img.src = URL.createObjectURL(file);
    });
}
// Function to create a visual overlay of detected barcodes
function createDynamsoftBarcodeVisualization(canvas, barcode) {
    const visualCanvas = document.createElement('canvas');
    visualCanvas.width = canvas.width;
    visualCanvas.height = canvas.height;
    const ctx = visualCanvas.getContext('2d');
    
    // Draw original image
    ctx.drawImage(canvas, 0, 0);
    
    // Draw bounding box around barcode
    if (barcode.coordinates && barcode.coordinates.length >= 4) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        
        // Dynamsoft returns points in [x,y] pairs
        const points = barcode.coordinates;
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Add label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(points[0][0], points[0][1] - 20, 200, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(`${barcode.format}: ${barcode.code} (${barcode.confidence.toFixed(1)}%)`, 
                    points[0][0] + 5, points[0][1] - 5);
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

async function detectSignature(canvas) {
    // Enhanced signature detection
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Focus on bottom 25% of the image where signatures usually are
    const signatureAreaHeight = Math.floor(canvas.height * 0.25);
    const startY = canvas.height - signatureAreaHeight;
    
    let signaturePixels = 0;
    let strokeWidthCount = 0;
    let lastDarkPixel = null;
    
    // Analyze pixels in the signature area
    for (let y = startY; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Check if pixel is dark (not white/light)
            if (r < 220 || g < 220 || b < 220) {
                signaturePixels++;
                
                // Check for stroke width (clusters of dark pixels)
                if (lastDarkPixel && 
                    Math.abs(x - lastDarkPixel.x) <= 2 && 
                    Math.abs(y - lastDarkPixel.y) <= 2) {
                    strokeWidthCount++;
                }
                
                lastDarkPixel = { x, y };
            }
        }
    }
    
    // Calculate signature area metrics
    const signatureArea = signatureAreaHeight * canvas.width;
    const density = signaturePixels / signatureArea;
    const strokeWidth = strokeWidthCount / signaturePixels;
    
    // Signature likely present if:
    // - More than 0.5% of area has dark pixels
    // - Average stroke width is > 1 pixel
    return density > 0.005 && strokeWidth > 1;
}

function addResultToTable(filename, result) {
    const row = document.createElement('tr');
    row.dataset.filename = filename;
    
    // Filter for Code 39 barcodes only
    const code39Barcodes = result.barcodes.filter(b => b.format === 'CODE_39');
    const hasCode39 = code39Barcodes.length > 0;
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                    ${result.fileType === 'application/pdf' ? 
                        '<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>' :
                        '<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'}
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">${filename}</div>
                    <div class="text-sm text-gray-500">${result.fileType}</div>
                </div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${hasCode39 ? 
                `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    ${code39Barcodes.length} found
                </span>` : 
                `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    None
                </span>`}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${result.signature ? 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Yes</span>' : 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">No</span>'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${result.error ? 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Error</span>' : 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Success</span>'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <button class="text-blue-600 hover:text-blue-900 view-details" data-filename="${filename}">View Details</button>
        </td>
    `;
    
    resultsBody.appendChild(row);
    row.querySelector('.view-details').addEventListener('click', () => showBarcodeDetails(filename));
}

function showBarcodeDetails(filename) {
    const fileResults = allBarcodeResults
        .filter(b => b.fileName === filename && b.format === 'CODE_39');
    
    if (fileResults.length === 0) {
        barcodeDetailsContent.innerHTML = `
            <p class="text-gray-500">
                No Code 39 barcodes found in this file.
            </p>
        `;
        barcodeDetails.classList.remove('hidden');
        return;
    }
    
    const fileRow = Array.from(resultsBody.querySelectorAll('tr'))
        .find(row => row.dataset.filename === filename);
    const hasSignature = fileRow ? 
        fileRow.querySelector('td:nth-child(3) span').textContent === 'Yes' : false;
    
    barcodeDetailsContent.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th class="px-4 py-2 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code 39 Barcode</th>
                        <th class="px-4 py-2 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signature</th>
                        <th class="px-4 py-2 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${fileResults.map((barcode, index) => `
                        <tr>
                            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 font-mono">${barcode.code}</td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm">
                                ${hasSignature ? 
                                    '<span class="text-green-500 font-medium">Yes</span>' : 
                                    '<span class="text-red-500 font-medium">No</span>'}
                            </td>
                            <td class="px-4 py-2 whitespace-nowrap text-sm">
                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                    <div class="bg-blue-600 h-2.5 rounded-full" 
                                        style="width: ${Math.min(100, barcode.confidence)}%"></div>
                                </div>
                                <span class="text-xs">${barcode.confidence.toFixed(1)}%</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    barcodeDetails.classList.remove('hidden');
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