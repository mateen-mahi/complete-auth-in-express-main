import cloudinary from "../config/cloudinary.js"; 


export function uploadToCloudinary(buffer, options = {}) {
    
  const { folder = "misc", transformation } = options;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        ...(transformation && { transformation }),
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(buffer);
  });
}