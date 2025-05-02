const express = require('express');
const multer = require('multer');
const Vibrant = require('node-vibrant');
const path = require('path');
const fs = require('fs');

// Initialize the Express app
const app = express();
const port = 3000;

// Set up file upload storage with validation for image types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
    }
    cb(null, Date.now() + ext);
  }
});

// Upload middleware with file size limit and validation
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // Limit file size to 5MB
}).single('image');

// Serve static files for images
app.use('/uploads', express.static('uploads'));

// Route to handle image upload and RGB extraction
app.post('/upload', (req, res) => {
  // Handle file upload errors
  upload(req, res, (err) => {
    if (err) {
      // Multer-specific error (file validation)
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      }
      // Custom error for invalid file type or size
      return res.status(400).json({ error: err.message });
    }

    // Check if no file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload an image.' });
    }

    const imagePath = path.join(__dirname, 'uploads', req.file.filename);

    // Use Vibrant to extract colors from the uploaded image
    Vibrant.from(imagePath).getPalette()
      .then(palette => {
        // If no palette is extracted
        if (!palette || Object.keys(palette).length === 0) {
          return res.status(500).json({ error: 'No colors extracted from the image.' });
        }

        const colorData = [];
        let colorCount = 0;

        // Calculate RGB percentages from the palette
        for (let color in palette) {
          if (palette[color]) {
            colorCount++;
            const colorRgb = palette[color].getRgb(); // Extract RGB values
            const colorHex = palette[color].getHex(); // Extract Hex value
            const colorPercentage = (colorCount / Object.keys(palette).length) * 100; // Calculate percentage

            colorData.push({
              color: colorHex,
              rgb: colorRgb,
              percentage: colorPercentage.toFixed(2) + '%'
            });
          }
        }

        // Return the extracted RGB colors and their percentages
        res.json(colorData);
      })
      .catch(err => {
        console.error('Error extracting colors:', err);
        res.status(500).json({ error: 'Error extracting colors from the image. Please try again.' });
      })
      .finally(() => {
        // Clean up uploaded image after processing (optional)
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error('Error deleting the image:', err);
          }
        });
      });
  });
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
