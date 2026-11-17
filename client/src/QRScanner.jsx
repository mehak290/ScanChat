import { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

function QRScanner({ onScan}) {
  const [scannedUserId, setScannedUserId] = useState("");
  const [scannerMessage, setScannerMessage] = useState("");

  function startScanner() {
    setScannerMessage("");

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setScannedUserId(decodedText);
        onScan(decodedText);
        setScannerMessage("QR scanned successfully!");
        onScan(decodedText);
        scanner.clear().catch(console.error);
      },
      () => {}
    );
  }

  return (
    <div>
      <h3>Scan QR Code 📷</h3>

      <button onClick={startScanner}>
        Open Scanner
      </button>

      <div id="qr-reader" style={{ marginTop: "15px" }} />

      {scannerMessage && <p>{scannerMessage}</p>}

      {scannedUserId && (
        <p>Scanned User ID: {scannedUserId}</p>
      )}
    </div>
  );
}

export default QRScanner;