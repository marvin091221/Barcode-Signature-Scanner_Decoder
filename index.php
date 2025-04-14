<!--
/**
 * @file index.php
 * @description Main entry point for the Barcode & Signature Scanner web application.
 *             This application allows users to scan barcode's (primarily Code 39)
 *             and detect signatures from both images and PDF files.
 * 
 * Key Features:
 * - Supports PDF and image file uploads
 * - Code 39 barcode scanning
 * - Signature detection adjacent to barcode's
 * - Real-time progress feedback
 * - Results export functionality
 * 
 * Dependencies:
 * - Dynamsoft Barcode Reader v9.6.2
 * - PDF.js v2.12.313
 * - PDF-lib v1.17.1
 * - Tailwind CSS v2.1.2
 */
-->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#4B5563">

    <!-- Base64 encoded favicon for instant loading -->
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABH0lEQVQ4jZ2TsUrDUBSGv5ObtCRpU6RQHFzcFAen4KBv4BOIm6Cg4CC+Qwfp4FOITyCCFEHo4Cq4ONSpFBrSm6RJk3sdhJKkaSD9t3M593z/OfdegULbtm2EKAC4rnsQhuE9gNBoNB4Mw7iSJKkmjuMkz/PexuPxc6PRaAHEO0YVQbIsKwKefd9/TNN0CKDrug0QWpZ1WqlUzvMjCoAfhuHQtu0XwzBUz/M+kyR5AnpFRFEEURRVYFiv1y/TNH3N5/MBMC0hJEli13XfgQfLsrr1ev1mF7EDsG37DugA98PhcAR8/QUQRVEpl8tn2Wx2K0nSMTM7/RJCKGaz2RQYAAPf9z+2VVqrQRAEvud5n7va/0f9N4AkSXIcxz+/AXZNu58fwVSzAAAAAElFTkSuQmCC">
    <title>Barcode & Signature Scanner</title>
    <meta name="description" content="A web application for scanning and decoding barcode's and signatures from documents.">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.1.2/dist/tailwind.min.css" rel="stylesheet">
    
    <!-- PDF reader -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>

    <!-- Back-up if the online library is down -->
    <!-- <script src="./library/pdf.min.js"></script> -->
    <!-- <script src="./library/pdf-lib.min.js"></script> -->

    <!-- Barcode Scanner and Decoder -->
    <!-- Online Libraray for Dynamsoft -->
    <!-- <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/dbr.js"></script> -->

    <script src="./library/dynamsoft-javascript-barcode-library.js"></script>

    <script>
        // Initialize license BEFORE any scanning operations
        Dynamsoft.DBR.BarcodeReader.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzODY5NTMyLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzODY5NTMyIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjoxMDQ2ODk4MzQ4fQ==';
        Dynamsoft.DBR.BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/";
    </script>
    <style>
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .barcode-canvas {
            display: none;
        }

        .relative select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
        }
    </style>
</head>
<body class="bg-gray-400 min-h-screen p-4">

    <div id="loadingIndicator" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white p-6 rounded-lg text-center">
            <div class="spinner mx-auto"></div>
            <p class="mt-4 text-lg">Loading scanner components...</p>
            <p id="loadingProgress" class="text-sm text-gray-600">Initializing OpenCV</p>
        </div>
    </div>

    <div class="container mx-auto bg-gray-200 py-6 px-10 rounded-lg shadow-lg max-w-6xl">
        <h1 class="text-3xl font-bold text-center">Document Scanner</h1>
        <p class="text-gray-600 text-center mb-6">Upload documents to scan for barcodes and signatures</p>

        <!-- File Upload Section --> 
        <div class="flex flex-col items-center">
            <input id="fileInput" type="file" accept=".pdf,.png,.jpg,.jpeg" class="hidden" multiple />
            <div id="dropZone" class="border-4 border-dashed border-gray-600 py-6 px-12 w-full text-center rounded-2xl mb-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="mt-2 text-gray-600">Drag and drop files here or click to browse</p>
                <p class="text-sm text-gray-500 mt-1">Supports PDF, PNG, JPG (Max 10MB each)</p>
        
                <div id="fileList" class="w-full mt-4"></div>
                <p id="errorMessage" class="text-red-500 text-center mt-2 hidden"></p>
            </div>
        </div>

        <!-- Scan Button -->
        <button id="scanBtn" class="flex justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                    <path d="M15 3v4a1 1 0 0 0 1 1h4"/>
                    <path d="M18 17h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l5 5v7a2 2 0 0 1-2 2"/>
                    <path d="M16 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"/>
                </g>
            </svg>
            Scan Documents
        </button>
        
        <!-- Progress Modal -->
        <div id="progressModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div class="flex justify-center mb-4">
                    <div class="spinner"></div>
                </div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Scanning Progress</h3>
                    <span id="progressPercent" class="font-medium">0%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div id="progressBar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
                <p id="progressText" class="text-sm text-gray-600 text-center">Preparing to scan...</p>
            </div>
        </div>

        <!-- Results Section -->
        <div id="resultsSection" class="hidden">
            <div class="flex justify-between items-center my-4">
                <h2 class="text-2xl font-semibold">Scan Results</h2>
                <div class="flex space-x-2">
                    <button id="exportBtn" class="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                                <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2m-5-4v-6"/>
                                <path d="M9.5 14.5L12 17l2.5-2.5"/>
                            </g>
                        </svg>
                        Export Results
                    </button>

                    <button id="clearResultsBtn" class="flex items-center bg-red-600 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-lg transition-colors gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16m-10 4v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>
                        </svg>
                        Clear Results
                    </button>
                </div>
            </div>
            
            <div class="overflow-x-auto mb-4 rounded-xl">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead class="bg-blue-300">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">File</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Barcode's Found</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Signatures Found</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody id="resultsBody" class="divide-y divide-gray-200">
                        <!-- Results will be populated here -->
                    </tbody>
                </table>
            </div>
            
            <!-- Barcode details options -->
            <div id="barcodeDetails" class="hidden bg-gray-50 p-4 border-2 rounded-xl">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-medium">Barcode Details</h3>
                    <div class="flex items-center gap-2">
                        <label class="text-center">Display options:</label>
                        <div class="relative flex items-center">
                            <select id="signatureFilter" class="appearance-none bg-white border-2 border-gray-300 rounded-md py-1 px-3 text-sm block focus:ring-blue-500 cursor-pointer pr-8">
                                <option value="all">All</option>
                                <option value="hasSignature">Has Signature</option>
                                <option value="noSignature">No Signature</option>
                            </select>
                            <!-- Custom dropdown arrow -->
                            <div class="pointer-events-none absolute right-2 inset-y-0 flex items-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9l6 6l6-6"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="barcodeDetailsContent" class="grid grid-cols-1 gap-4"></div>
            </div>
        </div>
    </div>

    <!-- Hidden canvases for processing -->
    <div class="barcode-canvas">
        <canvas id="processingCanvas"></canvas>
    </div>

    <script src="script.js"></script>
    <script src="addResultToTable_showBarcodeDetails.js"></script>
</body>
</html>