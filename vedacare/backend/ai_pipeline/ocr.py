"""
Stage 1 — OCR using MarkerPDF
Extracts raw text from prescription images and PDFs.
Single code path for both image and PDF uploads.
"""

import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text(file_path: str) -> str:
    """
    Extract raw text from a prescription image or PDF using MarkerPDF.

    Args:
        file_path: Absolute path to the image or PDF file.

    Returns:
        Raw extracted text string. Empty string on failure.
    """
    file_path = Path(file_path)

    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        return ""

    if file_path.suffix.lower() in (".txt", ".text"):
        logger.info(f"Text file detected, skipping OCR: {file_path.name}")
        return _fallback_extract(file_path)

    try:
        logger.info(f"Starting OCR on: {file_path.name}")

        # MarkerPDF handles both images and PDFs
        from marker.converters.pdf import PdfConverter
        from marker.models import create_model_dict
        from marker.output import text_from_rendered

        # Create converter with default models
        converter = PdfConverter(artifact_dict=create_model_dict())

        # Convert file — marker handles PDF and image formats
        rendered = converter(str(file_path))

        # Extract text from rendered output
        text, _, _ = text_from_rendered(rendered)

        if not text or not text.strip():
            logger.warning(f"OCR returned empty text for: {file_path.name}")
            return ""

        logger.info(
            f"OCR successful: extracted {len(text)} chars from {file_path.name}"
        )
        return text.strip()

    except Exception as e:
        logger.error(f"OCR failed for {file_path.name}: {e}")
        return ""


def _fallback_extract(file_path: Path) -> str:
    """
    Fallback text extraction if MarkerPDF fails to load.
    Tries basic approaches for common file types.
    """
    suffix = file_path.suffix.lower()

    try:
        if suffix in (".txt", ".text"):
            return file_path.read_text(encoding="utf-8").strip()

        if suffix == ".pdf":
            # Try PyPDF2 as fallback for PDFs
            try:
                import PyPDF2

                text_parts = []
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                return "\n".join(text_parts).strip()
            except ImportError:
                logger.warning("PyPDF2 not available for fallback PDF extraction")
                return ""

        # For images, try pytesseract as last resort
        if suffix in (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"):
            try:
                from PIL import Image
                import pytesseract

                img = Image.open(file_path)
                text = pytesseract.image_to_string(img)
                return text.strip()
            except ImportError:
                logger.warning(
                    "pytesseract/PIL not available for fallback image extraction"
                )
                return ""

    except Exception as e:
        logger.error(f"Fallback extraction also failed: {e}")

    return ""
