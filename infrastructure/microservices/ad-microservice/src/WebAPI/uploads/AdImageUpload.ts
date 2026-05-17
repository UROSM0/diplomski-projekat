import fs from "fs";
import path from "path";
import { RequestHandler } from "express";
import multer, { MulterError } from "multer";

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const uploadsRootDirectory = path.resolve(process.cwd(), "uploads");
const adUploadsDirectory = path.resolve(uploadsRootDirectory, "ads");

fs.mkdirSync(adUploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, adUploadsDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, uniqueFileName);
  },
});

const upload = multer({
  storage,
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

export const getUploadsRootDirectory = (): string => uploadsRootDirectory;

export const toStoredImageUrls = (files: Express.Multer.File[]): string[] =>
  files.map((file) => `/uploads/ads/${file.filename}`);

export const deleteUploadedFiles = async (files: Express.Multer.File[]): Promise<void> => {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // Best-effort cleanup when a request fails after files were already stored.
      }
    })
  );
};
