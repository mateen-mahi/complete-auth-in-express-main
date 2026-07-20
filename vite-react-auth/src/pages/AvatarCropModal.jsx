import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { FiCheck, FiX, FiZoomIn } from "react-icons/fi";
import { getCroppedImg } from "../utils/cropImage";
import "../styles/avatarCropModal.css";

export default function AvatarCropModal({ imageSrc, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(croppedBlob);
    } catch (err) {
      console.error("Crop failed:", err);
      setProcessing(false);
    }
  };

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-box">
        <div className="crop-modal-header">
          <h3>Adjust your photo</h3>
          <button
            type="button"
            className="crop-modal-close"
            onClick={onCancel}
            disabled={processing}
          >
            <FiX />
          </button>
        </div>

        <div className="crop-modal-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="crop-modal-zoom">
          <FiZoomIn />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>

        <div className="crop-modal-actions">
          <button
            type="button"
            className="crop-modal-btn cancel"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="crop-modal-btn confirm"
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? "Saving…" : <><FiCheck /> Use Photo</>}
          </button>
        </div>
      </div>
    </div>
  );
}
