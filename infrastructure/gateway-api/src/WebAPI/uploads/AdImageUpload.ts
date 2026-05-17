import { RequestHandler } from "express";
import multer, { MulterError } from "multer";

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: MAX_IMAGE_COUNT,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, and WebP images are allowed."));
      return;
    }

    callback(null, true);
  },
});

const toUploadErrorMessage = (error: unknown): string => {
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Each image must be 5 MB or smaller.";
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return `You can upload up to ${MAX_IMAGE_COUNT} images per ad.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Image upload failed.";
};

export const adImagesUploadMiddleware: RequestHandler = (req, res, next) => {
  upload.array("images", MAX_IMAGE_COUNT)(req, res, (error) => {
    if (error) {
      res.status(400).json({ message: toUploadErrorMessage(error) });
      return;
    }

    next();
  });
};
