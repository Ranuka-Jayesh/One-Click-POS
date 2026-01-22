import express from 'express';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../config/database.js';
import { logAdminActivity } from '../utils/adminLogs.js';
import { emitMenuItemUpdate } from '../utils/websocket.js';

// Helper function to update category item count
async function updateCategoryItemCount(categoryId: string, increment: number = 1) {
  try {
    const db = getDatabase();
    const categoriesCollection = db.collection('categories');
    
    // Find category by id
    const category = await categoriesCollection.findOne({ id: categoryId });
    if (category) {
      const newCount = Math.max(0, (category.itemCount || 0) + increment);
      await categoriesCollection.updateOne(
        { _id: category._id },
        { 
          $set: { 
            itemCount: newCount,
            updatedAt: new Date()
          } 
        }
      );
    }
  } catch (error) {
    console.error('Error updating category item count:', error);
    // Don't throw - this shouldn't break the main operation
  }
}

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'menu-items');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory:', uploadsDir);
  } catch (error) {
    console.error('❌ Failed to create uploads directory:', error);
  }
} else {
  console.log('✅ Uploads directory exists:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Helper function to get admin username from request
function getAdminUsername(req: express.Request): string {
  const adminUsername = req.headers['x-admin-username'] as string;
  if (adminUsername) {
    return adminUsername;
  }
  if (req.body && req.body.adminUsername) {
    return req.body.adminUsername;
  }
  return 'Admin';
}

// Image upload endpoint with multer error handling
router.post('/upload-image', (req, res, next) => {
  console.log('📤 Upload endpoint hit');
  console.log('Content-Type:', req.headers['content-type']);
  
  upload.single('image')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      console.error('❌ Multer error:', err);
      console.error('Error name:', err.name);
      // Check for MulterError by name (more reliable than instanceof)
      if (err.name === 'MulterError') {
        const multerErr = err as multer.MulterError;
        console.error('Error code:', multerErr.code);
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File size too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${multerErr.message}`
        });
      }
      // Handle other errors (like fileFilter errors)
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to upload image'
      });
    }
    // If no error, proceed to the route handler
    console.log('✅ Multer processing complete, proceeding to handler');
    next();
  });
}, async (req, res) => {
  try {
    console.log('📤 Image upload request received in handler');
    console.log('Request file:', req.file ? 'File received' : 'No file');
    console.log('Request body keys:', Object.keys(req.body));
    
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    console.log('✅ File uploaded successfully:', req.file.filename);
    console.log('File size:', req.file.size, 'bytes');
    console.log('File mimetype:', req.file.mimetype);
    console.log('File path:', req.file.path);

    // Return the URL path (not full path)
    const imageUrl = `/uploads/menu-items/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('❌ Image upload error in handler:', error);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const menuItemsCollection = db.collection('menu_items');

    const menuItems = await menuItemsCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Transform to match frontend format
    const itemsWithId = menuItems.map((item) => ({
      id: item.id || item._id.toString(),
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image: item.image || '/placeholder.svg',
      available: item.available !== undefined ? item.available : true,
      _id: item._id.toString(),
    }));

    res.json({
      success: true,
      menuItems: itemsWithId
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create new menu item
router.post('/', async (req, res) => {
  try {
    const { name, description, price, category, image, available } = req.body;

    console.log('Create menu item request:', { name, description, price, category, image, available });

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Menu item name is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Menu item description is required'
      });
    }

    // Handle both string and number types for price
    // Check if price is provided (not null/undefined/empty)
    if (price === null || price === undefined || price === '') {
      return res.status(400).json({
        success: false,
        error: 'Price is required'
      });
    }
    
    const priceValue = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid price is required (must be >= 0)'
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const db = getDatabase();
    const menuItemsCollection = db.collection('menu_items');

    // Check if name already exists
    const existingItem = await menuItemsCollection.findOne({ name: name.trim() });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: 'Menu item with this name already exists'
      });
    }

    // Generate ID from name (lowercase, replace spaces with hyphens)
    const itemId = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Create new menu item
    const newItem = {
      id: itemId,
      name: name.trim(),
      description: description.trim(),
      price: priceValue,
      category: category.trim(),
      image: image || '/placeholder.svg',
      available: available !== undefined ? available : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Inserting menu item:', newItem);
    const result = await menuItemsCollection.insertOne(newItem);

    // Log activity
    await logAdminActivity(
      db,
      'Menu Item',
      'Added',
      getAdminUsername(req),
      `New menu item created: ${name.trim()} (Price: Rs. ${priceValue.toFixed(2)})`,
      'success'
    );

    const createdItem = {
      ...newItem,
      _id: result.insertedId.toString(),
    };

    // Update category item count
    await updateCategoryItemCount(createdItem.category, 1);

    // Emit WebSocket event for menu item creation
    emitMenuItemUpdate({
      type: 'menu_item_created',
      menuItem: {
        id: createdItem.id,
        _id: createdItem._id,
        name: createdItem.name,
        category: createdItem.category,
      },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: 'Menu item created successfully',
      menuItem: createdItem
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Update menu item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image, available } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Menu item name is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Menu item description is required'
      });
    }

    // Handle both string and number types for price
    // Check if price is provided (not null/undefined/empty)
    if (price === null || price === undefined || price === '') {
      return res.status(400).json({
        success: false,
        error: 'Price is required'
      });
    }
    
    const priceValue = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid price is required (must be >= 0)'
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const db = getDatabase();
    const menuItemsCollection = db.collection('menu_items');

    // Find menu item by _id or id
    let menuItem;
    if (ObjectId.isValid(id)) {
      menuItem = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    } else {
      menuItem = await menuItemsCollection.findOne({ id });
    }

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Generate new ID from name if name changed
    const newItemId = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if new ID already exists (excluding current item)
    if (newItemId !== menuItem.id) {
      const existingItem = await menuItemsCollection.findOne({ 
        id: newItemId,
        _id: { $ne: menuItem._id }
      });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: 'Menu item with this name already exists'
        });
      }
    }

    // Update menu item
    const updateData = {
      id: newItemId,
      name: name.trim(),
      description: description.trim(),
      price: priceValue,
      category: category.trim(),
      image: image || menuItem.image || '/placeholder.svg',
      available: available !== undefined ? available : (menuItem.available !== false),
      updatedAt: new Date(),
    };

    // Update category item counts if category changed
    if (menuItem.category !== category.trim()) {
      // Decrement old category count
      await updateCategoryItemCount(menuItem.category, -1);
      // Increment new category count
      await updateCategoryItemCount(category.trim(), 1);
    }

    const result = await menuItemsCollection.updateOne(
      { _id: menuItem._id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Log activity
    await logAdminActivity(
      db,
      'Menu Item',
      'Updated',
      getAdminUsername(req),
      `Menu item updated: ${name.trim()} (Price: Rs. ${priceValue.toFixed(2)})`,
      'success'
    );

    // Get updated menu item
    const updatedItem = await menuItemsCollection.findOne({ _id: menuItem._id });

    const itemResponse = {
      ...updatedItem,
      id: updatedItem!.id,
      _id: updatedItem!._id.toString(),
    };

    // Emit WebSocket event for menu item update
    emitMenuItemUpdate({
      type: 'menu_item_updated',
      menuItem: {
        id: itemResponse.id,
        _id: itemResponse._id,
        name: updatedItem?.name || '',
        category: updatedItem?.category || '',
      },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      menuItem: itemResponse
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const menuItemsCollection = db.collection('menu_items');

    // Find menu item by _id or id
    let menuItem;
    if (ObjectId.isValid(id)) {
      menuItem = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    } else {
      menuItem = await menuItemsCollection.findOne({ id });
    }

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const result = await menuItemsCollection.deleteOne({ _id: menuItem._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Update category item count (decrement)
    await updateCategoryItemCount(menuItem.category, -1);

    // Log activity
    await logAdminActivity(
      db,
      'Menu Item',
      'Deleted',
      getAdminUsername(req),
      `Menu item deleted: ${menuItem.name}`,
      'success'
    );

    // Emit WebSocket event for menu item deletion
    emitMenuItemUpdate({
      type: 'menu_item_deleted',
      menuItemId: menuItem.id || menuItem._id.toString(),
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Toggle menu item availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;

    if (typeof available !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'available must be a boolean value'
      });
    }

    const db = getDatabase();
    const menuItemsCollection = db.collection('menu_items');

    // Find menu item by _id or id
    let menuItem;
    if (ObjectId.isValid(id)) {
      menuItem = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    } else {
      menuItem = await menuItemsCollection.findOne({ id });
    }

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    const result = await menuItemsCollection.updateOne(
      { _id: menuItem._id },
      { 
        $set: { 
          available,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Log activity
    await logAdminActivity(
      db,
      'Menu Item',
      available ? 'Made Available' : 'Made Unavailable',
      getAdminUsername(req),
      `Menu item ${available ? 'made available' : 'made unavailable'}: ${menuItem.name}`,
      'success'
    );

    // Emit WebSocket event for menu item availability change
    emitMenuItemUpdate({
      type: 'menu_item_availability_changed',
      menuItem: {
        id: menuItem.id || menuItem._id.toString(),
        _id: menuItem._id.toString(),
        name: menuItem.name,
        category: menuItem.category,
      },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: `Menu item ${available ? 'made available' : 'made unavailable'} successfully`
    });
  } catch (error) {
    console.error('Toggle menu item availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
