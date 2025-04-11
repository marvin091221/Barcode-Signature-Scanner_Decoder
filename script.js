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

// Function to process PDF files with row detection
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
                console.log(`[Debug] Barcode points:`, points);

                const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
                const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;

                const sigResult = await detectSignature(canvas, points);
                const hasSignature = sigResult.detected;

                console.log(`[Barcode] Text: ${barcode.barcodeText}, Page: ${pageNum}, Signature Detected: ${hasSignature}`);

                result.barcodes.push({
                    code: barcode.barcodeText,
                    format: barcode.barcodeFormatString,
                    confidence: barcode.localizationResult?.confidence || 0,
                    coordinates: points,
                    centerX,
                    centerY,
                    hasSignature,
                    page: pageNum,
                });

                if (hasSignature) result.signature = true;
            }
        }

        result.barcodes.sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            const rowThreshold = 30;
            if (Math.abs(a.centerY - b.centerY) < rowThreshold) return a.centerX - b.centerX;
            return a.centerY - b.centerY;
        });
    } catch (error) {
        console.error("Row-based scanning failed:", error);
        result.error = error.message;
    }

    return result;
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

// Function to create a canvas from a file
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

// // Function to scan barcodes on a canvas
// function detectSignature(canvas, barcodeCoordinates) {
//     // if (!barcodeCoordinates || barcodeCoordinates.length < 4) {
//     //     console.warn("⚠️ Barcode coordinates missing or invalid");
//     //     return { detected: false };
//     // }

//     const minY = Math.min(...barcodeCoordinates.map(p => p[1]));
//     const maxY = Math.max(...barcodeCoordinates.map(p => p[1]));
//     const barcodeHeight = maxY - minY;

//     const verticalMargin = 30;
//     const rowY = Math.max(0, minY - verticalMargin);
//     const rowHeight = Math.min(canvas.height - rowY, barcodeHeight + verticalMargin * 4);

//     const regionCanvas = document.createElement('canvas');
//     regionCanvas.width = canvas.width;
//     regionCanvas.height = rowHeight;
//     const ctx = regionCanvas.getContext('2d');
//     ctx.drawImage(canvas, 0, rowY, canvas.width, rowHeight, 0, 0, canvas.width, rowHeight);

//     const imageData = ctx.getImageData(0, 0, canvas.width, rowHeight);

//     // Append preview for debugging
//     regionCanvas.style.border = "2px solid red";
//     regionCanvas.style.width = "100%";
//     regionCanvas.style.marginBottom = "5px";
//     document.body.appendChild(regionCanvas);

//     const result = analyzeSignatureArea(imageData.data, canvas.width, rowHeight);
//     console.log("Signature area result →", result);
//     return result;
// }

// function analyzeSignatureArea(imageData, width, height) {
//     console.log("✅ Entered analyzeSignatureArea()");

//     // Tightened thresholds for signature-specific characteristics
//     const SIGNATURE_PIXEL_DENSITY_THRESHOLD = 0.03;
//     const SIGNATURE_STROKE_DENSITY_THRESHOLD = 0.025;
//     const MIN_SIGNATURE_AREA = 1500;

//     let signaturePixels = 0;
//     let totalPixels = 0;
//     let strokeTransitions = 0;
//     let potentialSignatureArea = 0;

//     for (let y = 0; y < height; y++) {
//         let prevDark = false;
//         let rowTransitionCount = 0;
//         let rowSignaturePixels = 0;

//         for (let x = 0; x < width; x++) {
//             const idx = (y * width + x) * 4;
//             const brightness = (imageData[idx] + imageData[idx+1] + imageData[idx+2]) / 3;

//             totalPixels++;

//             if (brightness < 100) {
//                 signaturePixels++;
//                 rowSignaturePixels++;
                
//                 if (!prevDark) {
//                     strokeTransitions++;
//                     rowTransitionCount++;
//                 }
//                 prevDark = true;
//             } else {
//                 prevDark = false;
//             }
//         }

//         if (rowTransitionCount > width * 0.9) {
//             strokeTransitions -= rowTransitionCount;
//             rowTransitionCount = 0;
//             continue;
//         }

//         if (rowSignaturePixels > width * 0.1 && 
//             rowTransitionCount > width * 0.05) {
//             potentialSignatureArea += width;
//         }
//     }

//     const pixelDensity = signaturePixels / totalPixels;
//     const strokeDensity = strokeTransitions / totalPixels;

//     // Calculate isSignature BEFORE using it
//     const isSignature = 
//         pixelDensity > SIGNATURE_PIXEL_DENSITY_THRESHOLD &&
//         strokeDensity > SIGNATURE_STROKE_DENSITY_THRESHOLD &&
//         potentialSignatureArea > MIN_SIGNATURE_AREA;

//     console.log("Signature check →", {
//         pixelDensity,
//         strokeDensity, 
//         potentialSignatureArea,
//         meetsThresholds: isSignature
//     });

//     return {
//         detected: isSignature,
//         pixelDensity,
//         strokeDensity,
//         signatureArea: potentialSignatureArea
//     };
// }

// // Sort barcodes top-to-bottom by Y coordinate
// function sortBarcodesByPageAndVerticalPosition(barcodes) {
//     return barcodes.sort((a, b) => {
//         if (a.page !== b.page) return a.page - b.page;
//         return a.centerY - b.centerY;
//     });
// }

// function detectSignature(canvas, barcodeCoordinates) {
//     if (!barcodeCoordinates || barcodeCoordinates.length < 4) {
//         console.warn("⚠️ Barcode coordinates missing or invalid");
//         return { detected: false };
//     }

//     // Calculate barcode boundaries
//     const minX = Math.min(...barcodeCoordinates.map(p => p[0]));
//     const maxX = Math.max(...barcodeCoordinates.map(p => p[0]));
//     const minY = Math.min(...barcodeCoordinates.map(p => p[1]));
//     const maxY = Math.max(...barcodeCoordinates.map(p => p[1]));
//     const barcodeHeight = maxY - minY;
//     const barcodeWidth = maxX - minX;

//     // Configuration for signature scanning
//     const scanOptions = {
//         pixelThreshold: 120,       // Higher threshold for darker signatures
//         minDensity: 0.03,         // Lower density threshold
//         minStrokeDensity: 0.01,    // Lower stroke density threshold
//         minSignatureWidth: 30,     // Smaller width for signature strokes
//         minBlocks: 2               // Require at least 2 potential signature blocks
//     };

//     // 1. Full Row Scan with expanded area
//     const rowPadding = Math.max(10, barcodeHeight * 0.5); // Increased padding
//     const rowStartY = Math.max(0, minY - rowPadding);
//     // const rowEndY = Math.min(canvas.height, maxY + rowPadding);
//     // const rowHeight = Math.max(30, rowEndY - rowStartY); // Minimum 20px height

//     const verticalMargin = 30;
//     const rowY = Math.max(0, minY - verticalMargin);
//     const rowHeight = Math.min(canvas.height - rowY, barcodeHeight + verticalMargin * 3.1);

//     // 2. Expanded Right-to-Center Scan
//     const rightSideStartX = Math.max(0, maxX - (barcodeWidth * 0.1)); // Start left of barcode edge
//     const rightSideWidth = Math.min(
//         canvas.width * 1, // Scan up to 100% of page width
//         canvas.width - rightSideStartX
//     );
//     const signatureFocusWidth = Math.max(
//         scanOptions.minSignatureWidth * 2, // Wider minimum area
//         Math.min(barcodeWidth * 4, rightSideWidth) 
//     );

//     // Validate dimensions
//     if (signatureFocusWidth <= 0 || rowHeight <= 0) {
//         console.warn("Invalid scan area dimensions", {
//             width: signatureFocusWidth,
//             height: rowHeight
//         });
//         return { detected: false };
//     }

//     // Create and draw canvases
//     const rowCanvas = document.createElement('canvas');
//     rowCanvas.width = Math.max(1, canvas.width);
//     rowCanvas.height = Math.max(1, rowHeight);
//     const rowCtx = rowCanvas.getContext('2d');
    
//     const focusCanvas = document.createElement('canvas');
//     focusCanvas.width = Math.max(1, signatureFocusWidth);
//     focusCanvas.height = Math.max(1, rowHeight);
//     const focusCtx = focusCanvas.getContext('2d');

//     try {
//         // Draw scan areas
//         rowCtx.drawImage(
//             canvas,
//             0, rowStartY, canvas.width, rowHeight,
//             0, 0, canvas.width, rowHeight
//         );
        
//         focusCtx.drawImage(
//             canvas,
//             rightSideStartX, rowStartY, signatureFocusWidth, rowHeight,
//             0, 0, signatureFocusWidth, rowHeight
//         );

//         // Debug visualization 
//         // Cover the whole row
//         rowCanvas.style.border = "2px solid blue";
//         rowCanvas.style.width = "100%";
//         rowCanvas.style.marginBottom = "5px";
//         document.body.appendChild(rowCanvas);

//         // Focus area for signature detection in the right side
//         focusCanvas.style.border = "2px solid red";
//         focusCanvas.style.width = "100%";
//         focusCanvas.style.marginBottom = "20px";
//         document.body.appendChild(focusCanvas);

//         // Analyze both areas with enhanced options
//         const rowResult = analyzeSignatureArea(
//             rowCtx.getImageData(0, 0, canvas.width, rowHeight),
//             canvas.width,
//             rowHeight,
//             scanOptions
//         );
        
//         const focusResult = analyzeSignatureArea(
//             focusCtx.getImageData(0, 0, signatureFocusWidth, rowHeight),
//             signatureFocusWidth,
//             rowHeight,
//             scanOptions
//         );

//         console.log("Enhanced Signature Analysis", {
//             fullRow: rowResult,
//             focusArea: focusResult,
//             scanAreas: {
//                 fullRow: { width: canvas.width, height: rowHeight },
//                 focusArea: { 
//                     x: rightSideStartX, 
//                     width: signatureFocusWidth, 
//                     height: rowHeight 
//                 }
//             },
//             barcodeDimensions: {
//                 width: barcodeWidth,
//                 height: barcodeHeight
//             }
//         });

//         // More lenient detection - consider focus area more important
//         return {
//             detected: focusResult.detected || (rowResult.detected && rowResult.confidence > 15),
//             scans: {
//                 fullRow: rowResult,
//                 focusArea: focusResult
//             },
//             confidence: Math.max(rowResult.confidence, focusResult.confidence)
//         };

//     } catch (error) {
//         console.error("Signature detection error:", error);
//         return { detected: false };
//     }
// }

// Function to detect signature in a specific area of the canvas ========================== WORKING =============================
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
        console.warn("Invalid signature area dimensions", {
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

        // // For debugging - show the analyzed area
        // signatureCanvas.style.border = "2px solid green";
        // signatureCanvas.style.width = "100%";
        // signatureCanvas.style.marginBottom = "20px";
        // document.body.appendChild(signatureCanvas);

        // Analyze the area
        const result = analyzeSignatureArea(
            signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height),
            signatureCanvas.width,
            signatureCanvas.height,
            scanOptions
        );

        console.log("Signature Analysis Result", {
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
            }
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

// This function analyzes the signature area and returns detection results
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
        const brightness = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
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
// =========================================================================================================================================

// Function to create a canvas from a file
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