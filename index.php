<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barcode & Signature Scanner</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.1.2/dist/tailwind.min.css" rel="stylesheet">

    <!-- Signature Scanner -->
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js"></script>

    <!-- PDF reader -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>

    <!-- Barcode Scanner and Decoder -->
    <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/dbr.js"></script>

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
        <button id="scanBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors">
            Scan Documents
        </button>

        <!-- Progress Indicator -->
        <div id="progressContainer" class="hidden mb-5">
            <div class="spinner mb-4"></div>
            <div class="flex justify-between mb-1 px-2">
                <span id="progressText" class="font-medium">Processing...</span>
                <span id="progressPercent" class="font-medium">0%</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-3.5">
                <div id="progressBar" class="bg-green-600 h-3.5 rounded-full" style="width: 0%"></div>
            </div>
        </div>

        <!-- Results Section -->
        <div id="resultsSection" class="hidden">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-semibold">Scan Results</h2>
                <div class="flex space-x-2">
                    <button id="exportBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        Export Results
                    </button>
                    <button id="clearResultsBtn" class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        Clear Results
                    </button>
                </div>
            </div>
            
            <div class="overflow-x-auto mb-4">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead class="bg-blue-300">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">File</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Barcodes Found</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Signature</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody id="resultsBody" class="divide-y divide-gray-200">
                        <!-- Results will be populated here -->
                    </tbody>
                </table>
            </div>
            
            <div id="barcodeDetails" class="hidden bg-gray-50 p-4 border-2 rounded-lg">
                <h3 class="font-medium mb-2">Barcode Details</h3>
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