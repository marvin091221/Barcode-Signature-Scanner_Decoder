# Barcode-Signature-Scanner_Decoder

======================================================================================================================================================
DynamSoft Link : 
https://www.dynamsoft.com/
======================================================================================================================================================

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

======================================================================================================================================================

How Dynamsoft is Used in script.js

A. Initialization
The library is initialized in initializeDynamsoft():

async function initializeDynamsoft() {
reader = await Dynamsoft.DBR.BarcodeReader.createInstance();
let settings = await reader.getRuntimeSettings();

    // Configure for Code 39 (can be expanded to other formats)
    settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_CODE_39;
    settings.minResultConfidence = 0; // Accept even low-confidence results

    await reader.updateRuntimeSettings(settings);

}

- createInstance(): Loads the Dynamsoft engine.
- getRuntimeSettings(): Retrieves current scanning settings.
- barcodeFormatIds: Specifies which barcode formats to detect (e.g., BF_CODE_39).
- minResultConfidence: Sets the minimum confidence threshold (0–100).

B. Barcode Detection

- For Images
  const barcodeResults = await reader.decode(canvas);

* Takes a canvas element (from an uploaded image) and returns detected barcodes.

- For PDFs
  const dataUrl = canvas.toDataURL('image/jpeg', 0.99);
  const barcodeResults = await reader.decode(dataUrl);
  Converts a PDF page to an image (JPEG) before decoding.

C. Results Structure

- Each detected barcode returns an object like:

{
barcodeText: "ABC123", // Decoded text
barcodeFormatString: "CODE_39", // Format (e.g., QR_CODE, UPC_A)
localizationResult: {
confidence: 90, // Detection confidence (0-100)
resultPoints: [[x1,y1], ...] // Barcode corner coordinates
}
}

======================================================================================================================================================

- Signture detection

* Implemented using custom pixel analysis and pattern recognition algorithms

* Key Techniques Used
  The signature detection algorithm uses the following manual image-processing techniques:

A. Pixel Density Analysis

- Scans the area to the right of the barcode (calculated dynamically based on barcode dimensions).
- Uses a brightness threshold (default: 200 for dark pixels) to identify potential signature strokes.
- Calculates the ratio of dark pixels to total pixels (pixelDensity).

B. Stroke Detection

- Counts dark-to-light transitions (stroke edges) to identify handwriting-like patterns.
- Measures stroke density (transitions per pixel) to distinguish signatures from printed text.

C. Block Analysis

- Identifies continuous dark regions (potential signature strokes) using:
- minSignatureWidth: Minimum width of a stroke (default: 30px).
- minBlocks: Minimum number of stroke blocks required (default: 2).

D. Confidence Scoring

- Combines metrics (pixelDensity, strokeDensity, potentialBlocks) into a weighted confidence score (0-100).

* Limitations

- False Positives: May detect dark patches or printed text as signatures.
- Fixed Thresholds: Requires tuning for different document types.
- No Shape Recognition: Cannot verify if the detected strokes resemble a signature (only checks density/patterns).
