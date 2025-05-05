<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta name="theme-color" content="#4B5563">
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABH0lEQVQ4jZ2TsUrDUBSGv5ObtCRpU6RQHFzcFAen4KBv4BOIm6Cg4CC+Qwfp4FOITyCCFEHo4Cq4ONSpFBrSm6RJk3sdhJKkaSD9t3M593z/OfdegULbtm2EKAC4rnsQhuE9gNBoNB4Mw7iSJKkmjuMkz/PexuPxc6PRaAHEO0YVQbIsKwKefd9/TNN0CKDrug0QWpZ1WqlUzvMjCoAfhuHQtu0XwzBUz/M+kyR5AnpFRFEEURRVYFiv1y/TNH3N5/MBMC0hJEli13XfgQfLsrr1ev1mF7EDsG37DugA98PhcAR8/QUQRVEpl8tn2Wx2K0nSMTM7/RJCKGaz2RQYAAPf9z+2VVqrQRAEvud5n7va/0f9N4AkSXIcxz+/AXZNu58fwVSzAAAAAElFTkSuQmCC">
    <title>Barcode & Signature Scanner</title>
    <meta name="description" content="A web application for scanning and decoding barcode's and signatures from documents.">

    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.1.2/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="./styles/styles.css">
    
    <!-- Online Library for PDF reader -->
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script> -->

    <!-- Online Library for Dynamsoft -->
    <!-- <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/dbr.js"></script> -->

    <!-- Back-up if the online library is down -->
    <script src="./library/dynamsoft-javascript-barcode-library.js"></script>

    <!-- Back-up if the online library is down -->
    <script src="./library/pdf.min.js"></script>
    <script src="./library/pdf-lib.min.js"></script>


    <script>
        // Initialize license BEFORE any scanning operations

        // Online Key license
        // Desktop/Server/Embedded
        // Dynamsoft.DBR.BarcodeReader.license = 't0081YQEAALmfgv2wIOnhZqELQff151Sfowr7X4bl6rzfyEIF2l0b9njuaCxkJTFLR2jPoQKGybXHGSfbPJBHnknG88g19y/7ZuB9M60q2SuSJEfI;t0082YQEAAEUCEu0lI1Xg9kXFa+Ty+vsnpSEOB8tnwdGHHueMdNxa8V+1oqpcbTVed8MJ7VVV7gl7vZVpUpzrNQByPYYuevDz+2bgfTOtKtkrEShIYw==;t0082YQEAAEdbwMwFMfQ49q/AH3mU6RACvEYgnzj0v5GSU0tR2OqjsRTmULoFauSlRkys22tCOBg8pWwrvPn+swiUPavLe/F+3wy8b6ZVJXsFDFBIYQ==';

        // Local Key license
        // JavaScript Web
        Dynamsoft.DBR.BarcodeReader.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzODY5NTMyLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzODY5NTMyIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjoxMDQ2ODk4MzQ4fQ==';
        Dynamsoft.DBR.BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/";

        // Load wasm in advance
        Dynamsoft.DBR.BarcodeReader.loadWasm();
    </script>
</head>
<body class="bg-gray-400 min-h-screen p-4">
    <!-- No Files Modal -->
    <div id="noFilesModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div class="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-center mb-2">No Files Uploaded</h3>
            <p class="text-sm text-gray-600 text-center mb-4">Please upload PDF or image files before scanning.</p>
            <div class="flex justify-center">
                <button id="noFilesModalClose" class="px-10 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    OK
                </button>
            </div>
        </div>
    </div>

    <div id="loadingIndicator" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="modal-content bg-white p-6 rounded-lg text-center">
            <div class="spinner mx-auto"></div>
            <p class="mt-4 text-lg">Loading scanner components...</p>
            <p id="loadingProgress" class="text-sm text-gray-600">Initializing scanner</p>
        </div>
    </div>

    <div class="container mx-auto bg-gray-200 py-6 px-10 rounded-lg shadow-lg max-w-6xl">
        <h1 class="text-3xl font-bold text-center">Document Scanner</h1>
        <p class="text-gray-600 text-center mb-6">Upload documents to scan for barcodes and signatures</p>

        <!-- File Upload Section --> 
        <form id="uploadForm" enctype="multipart/form-data" class="flex flex-col items-center">
            <input id="fileInput" type="file" name="files[]" accept=".pdf,.png,.jpg,.jpeg" class="hidden" multiple />
            <div id="dropZone" class="border-2 border-dashed border-gray-600 py-6 px-12 w-full text-center rounded-2xl mb-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="mt-2 text-gray-600">Drag and drop files here or click to browse</p>
                <p class="text-sm text-gray-500 mt-1">Supports PDF, PNG, JPG (Max 10MB each)</p>
        
                <div id="fileList" class="w-full mt-4"></div>
                <p id="errorMessage" class="text-red-500 text-center mt-2 hidden"></p>
            </div>
        </form>

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
            <div class="modal-content">
                <div class="flex justify-center mb-4">
                    <div class="spinner"></div>
                </div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Scanning Progress...</h3>
                    <span id="progressPercent" class="font-medium">0%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div id="progressBar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
                <p id="progressText" class="text-sm text-gray-600 text-center">Preparing to scan...</p>
            </div>
        </div>

        <!-- Export Modal -->
        <div id="exportModal" class="fixed inset-0 px-6 py-10 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div class="flex justify-center mb-4">
                    <!-- <div class="spinner"></div> -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24">
                        <g stroke="#10b981" stroke-width="1">
                            <circle cx="12" cy="12" r="9.5" fill="none" stroke-linecap="round" stroke-width="3">
                                <animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150" />
                                <animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59" />
                            </circle>
                            <animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
                        </g>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-center mb-2">Exporting Results</h3>
                <p class="text-sm text-gray-600 text-center mb-4">Please wait while we prepare your export...</p>
            </div>
        </div>

        <!-- Clear Results Confirmation Modal -->
        <div id="confirmClearModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal hidden">
            <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div class="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-center mb-2">Clear All Results?</h3>
                <p class="text-sm text-gray-600 text-center mb-4">This will remove all scan results and cannot be undone.</p>
                <div class="flex justify-center gap-4">
                    <button id="confirmClearCancel" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancel
                    </button>
                    <button id="confirmClearConfirm" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Clear Results
                    </button>
                </div>
            </div>
        </div>
        <!-- Clearing Progress Modal -->
        <div id="clearingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal hidden">
            <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div class="flex justify-center mb-4">
                    <div class="spinner"></div>
                </div>
                <h3 class="text-lg font-semibold text-center mb-2">Clearing Results</h3>
                <p class="text-sm text-gray-600 text-center">Please wait a moment while we clear all results...</p>
            </div>
        </div>
        <!-- Clear Success Modal -->
        <div id="clearSuccessModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div class="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-center mb-2">Results Cleared</h3>
                <p class="text-sm text-gray-600 text-center mb-4">All scan results have been cleared successfully.</p>
                <div class="flex justify-center">
                    <button id="clearSuccessOk" class="px-10 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        OK
                    </button>
                </div>
            </div>
        </div>

        <!-- Export Options Modal -->
        <div id="exportOptionsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 class="text-lg font-semibold text-center mb-4">Export Options</h3>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Signature:</label>
                    <div class="flex flex-col space-y-2">
                        <label class="inline-flex items-center">
                            <input type="radio" name="exportFilter" value="all" class="form-radio h-4 w-4 text-blue-600" checked>
                            <span class="ml-2">All barcodes</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="radio" name="exportFilter" value="hasSignature" class="form-radio h-4 w-4 text-blue-600">
                            <span class="ml-2">Barcodes with signature</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="radio" name="exportFilter" value="noSignature" class="form-radio h-4 w-4 text-blue-600">
                            <span class="ml-2">Barcodes without signature</span>
                        </label>
                    </div>
                </div>
                
                <div class="flex justify-center gap-4">
                    <button id="exportOptionsCancel" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancel
                    </button>
                    <button id="exportOptionsConfirm" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Export
                    </button>
                </div>
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
                                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2m-5-4v-6" />
                                <path d="M9.5 14.5L12 17l2.5-2.5" />
                            </g>
                        </svg>
                        <span class="export-text">Export Results</span>
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

   <script src="./script.js"></script>
   <script src="./results.js"></script>
</body>
</html>