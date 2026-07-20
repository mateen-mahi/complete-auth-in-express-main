// Place this in something like src/utils/cropImage.js

export function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    img.setAttribute("crossOrigin", "anonymous"); // avoids canvas tainting
    img.src = url;
  });
}

/**
 * Draws only the cropped region onto a fixed-size canvas and
 * returns it as a JPEG Blob, ready to append to FormData.
 *
 * @param {string} imageSrc         object URL of the originally selected file
 * @param {object} croppedAreaPixels { x, y, width, height } from react-easy-crop's onCropComplete
 * @param {number} outputSize       final square size in px (default 400x400)
 */
export async function getCroppedImg(imageSrc, croppedAreaPixels, outputSize = 400) {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}
