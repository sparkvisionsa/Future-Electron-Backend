const Ad = require("../../infrastructure/models/Ad");

/**
 * GET /api/ads/all
 * Query:
 *  - page=1
 *  - limit=500 (max 5000)
 *  - city=string (filter by city)
 *  - currency=string (filter by currency)
 *  - hasPrice=true/false (filter by price existence)
 *  - hasImages=true/false (filter by images existence)
 *  - hasContact=true/false (filter by contact existence)
 *  - search=string (search in title, description, authorName, city)
 */
async function getAllAds(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || "500", 10) || 500;
    const limit = Math.min(Math.max(limitRaw, 1), 5000);

    // Build query filter
    const query = {};
    const andConditions = [];

    // City filter
    if (req.query.city) {
      query.city = req.query.city;
    }

    // Currency filter
    if (req.query.currency) {
      query.currency = req.query.currency;
    }

    // Price filter
    if (req.query.hasPrice === 'true') {
      query.price = { $exists: true, $ne: null, $gt: 0 };
    } else if (req.query.hasPrice === 'false') {
      andConditions.push({
        $or: [
          { price: { $exists: false } },
          { price: null },
          { price: { $lte: 0 } }
        ]
      });
    }

    // Images filter
    if (req.query.hasImages === 'true') {
      andConditions.push({
        $or: [
          { images: { $exists: true, $ne: null, $not: { $size: 0 } } },
          { $expr: { $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] } }
        ]
      });
    } else if (req.query.hasImages === 'false') {
      andConditions.push({
        $or: [
          { images: { $exists: false } },
          { images: null },
          { images: [] },
          { $expr: { $eq: [{ $size: { $ifNull: ['$images', []] } }, 0] } }
        ]
      });
    }

    // Contact filter
    if (req.query.hasContact === 'true') {
      query['contact.phone'] = { $exists: true, $ne: null, $ne: '' };
    } else if (req.query.hasContact === 'false') {
      andConditions.push({
        $or: [
          { 'contact.phone': { $exists: false } },
          { 'contact.phone': null },
          { 'contact.phone': '' }
        ]
      });
    }

    // Search filter (search in multiple fields)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      andConditions.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { authorName: searchRegex },
          { city: searchRegex }
        ]
      });
    }

    // Combine all conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const [items, total] = await Promise.all([
      Ad.find(query)
        .sort({ lastScrapedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Ad.countDocuments(query),
    ]);

    // Debug: Log first item's raw structure to understand data format
    if (items.length > 0) {
      const firstItem = items[0];
      console.log('=== DEBUG: First Ad Item Structure ===');
      console.log('All keys:', Object.keys(firstItem));
      console.log('images field:', firstItem.images);
      console.log('images type:', typeof firstItem.images);
      console.log('images isArray:', Array.isArray(firstItem.images));
      if (Array.isArray(firstItem.images)) {
        console.log('images length:', firstItem.images.length);
        if (firstItem.images.length > 0) {
          console.log('First image item:', firstItem.images[0]);
          console.log('First image type:', typeof firstItem.images[0]);
        }
      }
      // Check for alternative field names
      const altFields = ['imageUrls', 'image_urls', 'imageList', 'photos', 'pictures', 'media', 'image', 'imageUrl'];
      altFields.forEach(field => {
        if (firstItem[field]) {
          console.log(`Found alternative field "${field}":`, firstItem[field]);
        }
      });
      console.log('=====================================');
    }

    // Ensure images field is always present and properly formatted
    // Also check for alternative field names that might contain images
    const itemsWithImages = items.map((item, index) => {
      // Check for images in various possible field names
      let imagesArray = item.images;
      
      // If images is missing, check alternative field names
      if (!imagesArray || (Array.isArray(imagesArray) && imagesArray.length === 0)) {
        imagesArray = item.imageUrls || item.image_urls || item.imageList || item.photos || item.pictures || item.media || item.image || item.imageUrl || [];
      }
      
      // If images is missing or null, set it to empty array
      if (!imagesArray) {
        imagesArray = [];
      }
      
      // If images is not an array, try to convert it
      if (!Array.isArray(imagesArray)) {
        if (typeof imagesArray === 'string') {
          // Try to parse if it's a JSON string
          try {
            imagesArray = JSON.parse(imagesArray);
            if (!Array.isArray(imagesArray)) {
              imagesArray = [imagesArray];
            }
          } catch {
            // If parsing fails, treat as single URL string
            imagesArray = imagesArray.trim() ? [imagesArray] : [];
          }
        } else if (typeof imagesArray === 'object' && imagesArray !== null) {
          // Convert object to array
          imagesArray = [imagesArray];
        } else {
          imagesArray = [];
        }
      }
      
      // Process each image item to extract URLs
      const processedImages = [];
      for (const img of imagesArray) {
        if (typeof img === 'string' && img.trim()) {
          // Direct URL string - accept any non-empty string
          const trimmed = img.trim();
          if (trimmed) {
            // If it's a full URL, use it as-is
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
              processedImages.push(trimmed);
            } 
            // If it starts with //, it's a protocol-relative URL
            else if (trimmed.startsWith('//')) {
              processedImages.push('https:' + trimmed);
            }
            // If it starts with /, it might be a relative URL - try to construct full URL
            else if (trimmed.startsWith('/')) {
              // Try to construct full URL from haraj domain
              if (item.url) {
                try {
                  const baseUrl = new URL(item.url);
                  processedImages.push(new URL(trimmed, baseUrl.origin).href);
                } catch {
                  processedImages.push(trimmed);
                }
              } else {
                processedImages.push(trimmed);
              }
            }
            // Otherwise, assume it's a valid URL or path
            else {
              processedImages.push(trimmed);
            }
          }
        } else if (typeof img === 'object' && img !== null) {
          // Try to extract URL from object - prioritize originalUrl and cloudinaryUrl (Haraj format)
          // Check originalUrl first, then cloudinaryUrl, then other common properties
          const url = img.originalUrl || img.cloudinaryUrl || img.url || img.src || img.link || img.image || img.imageUrl || img.path || img.uri || img.href || img.original || img.full || img.thumbnail || img.value || img.data;
          if (url) {
            if (typeof url === 'string' && url.trim()) {
              const trimmed = url.trim();
              // Accept any string that looks like it could be a URL
              if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//') || trimmed.startsWith('/')) {
                if (trimmed.startsWith('//')) {
                  processedImages.push('https:' + trimmed);
                } else if (trimmed.startsWith('/') && item.url) {
                  try {
                    const baseUrl = new URL(item.url);
                    processedImages.push(new URL(trimmed, baseUrl.origin).href);
                  } catch {
                    processedImages.push(trimmed);
                  }
                } else {
                  processedImages.push(trimmed);
                }
              } else {
                // Even if it doesn't start with http, accept it (might be a valid path)
                processedImages.push(trimmed);
              }
            } else if (typeof url === 'object' && url !== null) {
              // Nested object, try to extract URL recursively
              const nestedUrl = url.originalUrl || url.cloudinaryUrl || url.url || url.src || url.link;
              if (nestedUrl && typeof nestedUrl === 'string' && nestedUrl.trim()) {
                processedImages.push(nestedUrl.trim());
              }
            }
          }
        }
      }
      
      item.images = processedImages;
      
      // Debug: Log first item's processed images
      if (index === 0 && processedImages.length > 0) {
        console.log('=== Processed Images (First Item) ===');
        console.log('Total processed images:', processedImages.length);
        console.log('First 3 image URLs:', processedImages.slice(0, 3));
        console.log('===================================');
      }
      
      return item;
    });

    return res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items: itemsWithImages, // ✅ all fields with normalized images
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

module.exports = { getAllAds };
