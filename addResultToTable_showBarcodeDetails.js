/**
 * @file addResultToTable_showBarcodeDetails.js
 * @description Handles the display and visualization of barcode scanning results
 *             in a table format, including detailed views of individual barcode's
 *             and their associated signatures.
 */

/**
 * Adds a scan result row to the results table.
 * 
 * @param {string} filename - Name of the processed file
 * @param {Object} result - Scan result object containing:
 *   @param {Array} result.barcodes - Array of detected barcodes
 *   @param {boolean} result.signature - Whether a signature was detected
 *   @param {string} result.fileType - Type of the processed file (PDF/image)
 *   @param {string} [result.error] - Error message if processing failed
 * @returns {void}
 */
function addResultToTable(filename, result) {
    const row = document.createElement('tr');
    row.dataset.filename = filename;
    
    // Filter for Code 39 barcodes only
    const code39Barcodes = result.barcodes.filter(b => 
        b.format === 'CODE_39' && b.confidence >= 30
    );
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
                `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    None
                </span>`}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${result.barcodes.filter(b => b.hasSignature).length > 0 ? 
                `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    ${result.barcodes.filter(b => b.hasSignature).length} detected
                </span>` : 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">None</span>'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${result.error ? 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Error</span>' : 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Success</span>'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <button class="px-3 py-1 rounded-lg text-white bg-blue-500 hover:border-2 hover:border-blue-800 hover:bg-blue-700 view-details" 
                    data-filename="${filename}"
                    data-showing="false">
                View Details
            </button>
        </td>
    `;
    
    resultsBody.appendChild(row);
    row.querySelector('.view-details').addEventListener('click', showBarcodeDetails);
}

function showBarcodeDetails(event) {
    const button = event.target;
    const filename = button.dataset.filename;
    const isShowing = button.dataset.showing === "true";
    
    if (isShowing) {
        // Hide details
        barcodeDetails.classList.add('hidden');
        button.textContent = "View Details";
        button.dataset.showing = "false";
    } else {
        // Show details
        const fileResults = allBarcodeResults
            .filter(b => b.fileName === filename && b.format === 'CODE_39');
    
        if (fileResults.length === 0) {
            barcodeDetailsContent.innerHTML = `
                <p class="text-gray-500">
                    No Code 39 barcodes found in this file.
                </p>
            `;
            // barcodeDetails.classList.remove('hidden');
            // return;
        } else {
            barcodeDetailsContent.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200">
                        <thead class="bg-blue-300">
                            <tr>
                                <th class="px-4 py-2 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">#</th>
                                <th class="px-4 py-2 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Barcode</th>
                                <th class="px-4 py-2 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Signature</th>
                                <th class="px-4 py-2 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Barcode Confidence</th>
                                <th class="px-4 py-2 border-b border-gray-200 text-left text-l font-medium text-gray-800 uppercase tracking-wider">Signature Confidence</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${fileResults.map((barcode, index) => `
                                <tr>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 font-mono">${barcode.code}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                                        ${barcode.hasSignature ? 
                                            '<span class="text-green-500 font-medium">Detected</span>' : 
                                            '<span class="text-red-500 font-medium">None</span>'}
                                    </td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                                            <div class="bg-blue-600 h-2.5 rounded-full" 
                                                style="width: ${Math.min(100, barcode.confidence)}%"></div>
                                        </div>
                                        <span class="text-xs">${barcode.confidence.toFixed(1)}%</span>
                                    </td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                                        ${barcode.hasSignature ? `
                                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                                <div class="bg-green-600 h-2.5 rounded-full" 
                                                    style="width: ${Math.min(100, barcode.signatureConfidence || 0)}%"></div>
                                            </div>
                                            <span class="text-xs">${(barcode.signatureConfidence || 0).toFixed(1)}%</span>
                                        ` : `
                                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                                <div class="bg-red-600 h-2.5 rounded-full" style="width: 0%"></div>
                                            </div>
                                            <span class="text-xs">0%</span>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        barcodeDetails.classList.remove('hidden');
        button.textContent = "Hide Details";
        button.dataset.showing = "true";
    }
}