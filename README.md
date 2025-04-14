# Barcode-Signature-Scanner_Decoder

This is the library that is use for barcodscanner and for the PDF file

 <!-- PDF reader -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>

<!-- Link of the the Dynamsoft (https://www.dynamsoft.com/) -->
- The Dynamsoft Barcode Reader (DBR) is a high-performance SDK designed to detect and decode 1D/2D barcodes from images, PDFs, and video streams. It is used in the provided script.js to scan barcodes in uploaded files (PDFs and images). 
- The library is initialized in initializeDynamsoft()
<!-- Barcode Scanner and Decoder -->
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/dbr.js"></script>

<script>
    // Initialize license BEFORE any scanning operations
    Dynamsoft.DBR.BarcodeReader.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzODY5NTMyLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzODY5NTMyIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjoxMDQ2ODk4MzQ4fQ==';
    Dynamsoft.DBR.BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.2/dist/";
</script>

* Signture detection
- Implemented using custom pixel analysis and pattern recognition algorithms

- Key Techniques Used
The signature detection algorithm uses the following manual image-processing techniques:

A. Pixel Density Analysis
Scans the area to the right of the barcode (calculated dynamically based on barcode dimensions).
Uses a brightness threshold (default: 200 for dark pixels) to identify potential signature strokes.
Calculates the ratio of dark pixels to total pixels (pixelDensity).

B. Stroke Detection
Counts dark-to-light transitions (stroke edges) to identify handwriting-like patterns.
Measures stroke density (transitions per pixel) to distinguish signatures from printed text.

C. Block Analysis
Identifies continuous dark regions (potential signature strokes) using:
minSignatureWidth: Minimum width of a stroke (default: 30px).
minBlocks: Minimum number of stroke blocks required (default: 2).

D. Confidence Scoring
Combines metrics (pixelDensity, strokeDensity, potentialBlocks) into a weighted confidence score (0-100).