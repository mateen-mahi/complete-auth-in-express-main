import cloudinary from "../config/cloudinary.js";

export function uploadDocument(buffer, options = {}) {
  const { folder = "LMS Documents" } = options;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder,
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          originalFilename: result.original_filename,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    stream.end(buffer);
  });
}