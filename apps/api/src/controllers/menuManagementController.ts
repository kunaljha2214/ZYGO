import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, isMenuItemActiveNow, type SpicyLevel } from '../models/MenuItem';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { PENDING_APPROVAL_MSG, requireApprovedRestaurantId } from '../utils/menuAccess';
import { saveBase64Document } from '../utils/uploads';

function serializeCategory(doc: InstanceType<typeof MenuCategory>) {
  return {
    id: doc.id,
    name: doc.name,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
  };
}

function serializeMenuItemFull(doc: InstanceType<typeof MenuItem>) {
  return {
    id: doc.id,
    categoryId: doc.categoryId?.toString() ?? null,
    name: doc.name,
    price: doc.price,
    category: doc.category,
    description: doc.description,
    imageUrl: doc.imageUrl,
    preparationTimeMinutes: doc.preparationTimeMinutes,
    isVeg: doc.isVeg,
    spicyLevel: doc.spicyLevel,
    calories: doc.calories,
    variants: doc.variants,
    addOns: doc.addOns,
    stockStatus: doc.stockStatus,
    availableFrom: doc.availableFrom,
    availableUntil: doc.availableUntil,
    autoDisableAt: doc.autoDisableAt?.toISOString() ?? null,
    isAvailable: doc.isAvailable,
    isActiveNow: isMenuItemActiveNow(doc),
  };
}

function parseItemBody(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? '').trim(),
    price: Number(body.price),
    categoryId: body.categoryId ? String(body.categoryId) : null,
    category: String(body.category ?? '').trim(),
    description: String(body.description ?? '').trim(),
    imageUrl: String(body.imageUrl ?? '').trim(),
    imageDataUrl: body.imageDataUrl ? String(body.imageDataUrl) : undefined,
    preparationTimeMinutes: Number(body.preparationTimeMinutes ?? 15),
    isVeg: body.isVeg !== false,
    spicyLevel: Number(body.spicyLevel ?? 0) as SpicyLevel,
    calories: body.calories != null && body.calories !== '' ? Number(body.calories) : null,
    variants: Array.isArray(body.variants) ? body.variants : [],
    addOns: Array.isArray(body.addOns) ? body.addOns : [],
    stockStatus: body.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'in_stock',
    availableFrom: body.availableFrom ? String(body.availableFrom) : null,
    availableUntil: body.availableUntil ? String(body.availableUntil) : null,
    autoDisableAt: body.autoDisableAt ? new Date(String(body.autoDisableAt)) : null,
    isAvailable: body.isAvailable !== false,
  };
}

async function resolveCategoryName(
  restaurantId: string,
  categoryId: string | null,
  fallback: string
): Promise<string> {
  if (!categoryId) return fallback || 'General';
  const cat = await MenuCategory.findOne({ _id: categoryId, restaurantId });
  return cat?.name ?? (fallback || 'General');
}

export async function getMenuManagement(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await OwnerRestaurant.findOne({ ownerId: req.user!.sub });
    if (!reg) {
      res.json({ approved: false, message: PENDING_APPROVAL_MSG, categories: [], items: [] });
      return;
    }
    if (reg.approvalStatus !== 'approved' || !reg.restaurantListingId) {
      res.json({
        approved: false,
        approvalStatus: reg.approvalStatus,
        message: PENDING_APPROVAL_MSG,
        categories: [],
        items: [],
      });
      return;
    }
    const restaurantId = reg.restaurantListingId;
    const [categories, items] = await Promise.all([
      MenuCategory.find({ restaurantId }).sort({ sortOrder: 1, name: 1 }),
      MenuItem.find({ restaurantId }).sort({ category: 1, name: 1 }),
    ]);
    res.json({
      approved: true,
      restaurantId: restaurantId.toString(),
      shopName: reg.name,
      categories: categories.map(serializeCategory),
      items: items.map(serializeMenuItemFull),
    });
  } catch (e) {
    next(e);
  }
}

export async function listCategories(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const categories = await MenuCategory.find({ restaurantId }).sort({ sortOrder: 1, name: 1 });
    res.json({ categories: categories.map(serializeCategory) });
  } catch (e) {
    next(e);
  }
}

export async function createCategory(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const { name, sortOrder } = req.body as { name: string; sortOrder?: number };
    const cat = await MenuCategory.create({
      restaurantId,
      name: name.trim(),
      sortOrder: sortOrder ?? 0,
      isActive: true,
    });
    res.status(201).json({ category: serializeCategory(cat) });
  } catch (e) {
    next(e);
  }
}

export async function updateCategory(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const cat = await MenuCategory.findOne({ _id: req.params.categoryId, restaurantId });
    if (!cat) {
      next(createError(404, 'Category not found'));
      return;
    }
    const body = req.body as { name?: string; sortOrder?: number; isActive?: boolean };
    if (body.name != null) cat.name = body.name.trim();
    if (body.sortOrder != null) cat.sortOrder = body.sortOrder;
    if (body.isActive != null) cat.isActive = body.isActive;
    await cat.save();

    if (body.name) {
      await MenuItem.updateMany(
        { restaurantId, categoryId: cat._id },
        { $set: { category: cat.name } }
      );
    }
    res.json({ category: serializeCategory(cat) });
  } catch (e) {
    next(e);
  }
}

export async function deleteCategory(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const cat = await MenuCategory.findOne({ _id: req.params.categoryId, restaurantId });
    if (!cat) {
      next(createError(404, 'Category not found'));
      return;
    }
    const itemCount = await MenuItem.countDocuments({ categoryId: cat._id });
    if (itemCount > 0) {
      next(createError(409, 'Move or delete items in this category first'));
      return;
    }
    await MenuCategory.deleteOne({ _id: cat._id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function createMenuItemFull(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const parsed = parseItemBody(req.body as Record<string, unknown>);
    if (!parsed.name) {
      next(createError(400, 'Item name required'));
      return;
    }
    if (!Number.isFinite(parsed.price) || parsed.price < 1) {
      next(createError(400, 'Valid price required'));
      return;
    }

    const categoryName = await resolveCategoryName(
      restaurantId,
      parsed.categoryId,
      parsed.category
    );

    let imageUrl = parsed.imageUrl;
    if (parsed.imageDataUrl) {
      const saved = saveBase64Document(parsed.imageDataUrl, 'menu-item');
      imageUrl = saved.url;
    }

    const item = await MenuItem.create({
      restaurantId,
      categoryId: parsed.categoryId || null,
      name: parsed.name,
      price: parsed.price,
      category: categoryName,
      description: parsed.description,
      imageUrl,
      preparationTimeMinutes: parsed.preparationTimeMinutes,
      isVeg: parsed.isVeg,
      spicyLevel: Math.min(3, Math.max(0, parsed.spicyLevel)) as SpicyLevel,
      calories: parsed.calories,
      variants: parsed.variants,
      addOns: parsed.addOns,
      stockStatus: parsed.stockStatus,
      availableFrom: parsed.availableFrom,
      availableUntil: parsed.availableUntil,
      autoDisableAt: parsed.autoDisableAt,
      isAvailable: parsed.isAvailable,
    });

    res.status(201).json({ item: serializeMenuItemFull(item) });
  } catch (e) {
    next(e instanceof Error ? createError(400, e.message) : e);
  }
}

export async function updateMenuItemFull(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const item = await MenuItem.findOne({ _id: req.params.itemId, restaurantId });
    if (!item) {
      next(createError(404, 'Menu item not found'));
      return;
    }

    const parsed = parseItemBody(req.body as Record<string, unknown>);
    if (parsed.name) item.name = parsed.name;
    if (Number.isFinite(parsed.price) && parsed.price >= 1) item.price = parsed.price;
    if (parsed.categoryId !== undefined) item.categoryId = parsed.categoryId as unknown as typeof item.categoryId;
    item.category = await resolveCategoryName(
      restaurantId,
      parsed.categoryId,
      parsed.category || item.category
    );
    item.description = parsed.description;
    if (parsed.imageDataUrl) {
      const saved = saveBase64Document(parsed.imageDataUrl, 'menu-item');
      item.imageUrl = saved.url;
    } else if (parsed.imageUrl) {
      item.imageUrl = parsed.imageUrl;
    }
    item.preparationTimeMinutes = parsed.preparationTimeMinutes;
    item.isVeg = parsed.isVeg;
    item.spicyLevel = Math.min(3, Math.max(0, parsed.spicyLevel)) as SpicyLevel;
    item.calories = parsed.calories;
    item.variants = parsed.variants as typeof item.variants;
    item.addOns = parsed.addOns as typeof item.addOns;
    item.stockStatus = parsed.stockStatus as typeof item.stockStatus;
    item.availableFrom = parsed.availableFrom;
    item.availableUntil = parsed.availableUntil;
    item.autoDisableAt = parsed.autoDisableAt;
    item.isAvailable = parsed.isAvailable;
    await item.save();

    res.json({ item: serializeMenuItemFull(item) });
  } catch (e) {
    next(e instanceof Error ? createError(400, e.message) : e);
  }
}

export async function patchMenuItemAvailability(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const item = await MenuItem.findOne({ _id: req.params.itemId, restaurantId });
    if (!item) {
      next(createError(404, 'Menu item not found'));
      return;
    }
    const body = req.body as {
      stockStatus?: 'in_stock' | 'out_of_stock';
      isAvailable?: boolean;
      autoDisableAt?: string | null;
    };
    if (body.stockStatus) item.stockStatus = body.stockStatus;
    if (body.isAvailable != null) item.isAvailable = body.isAvailable;
    if (body.autoDisableAt !== undefined) {
      item.autoDisableAt = body.autoDisableAt ? new Date(body.autoDisableAt) : null;
    }
    await item.save();
    res.json({ item: serializeMenuItemFull(item) });
  } catch (e) {
    next(e);
  }
}

export async function deleteMenuItemFull(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const item = await MenuItem.findOne({ _id: req.params.itemId, restaurantId });
    if (!item) {
      next(createError(404, 'Menu item not found'));
      return;
    }
    await MenuItem.deleteOne({ _id: item._id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function bulkImportCsv(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const { csv } = req.body as { csv: string };
    if (!csv?.trim()) {
      next(createError(400, 'CSV content required'));
      return;
    }
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      next(createError(400, 'CSV must have a header row and at least one item'));
      return;
    }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const created: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = cols[idx] ?? '';
      });
      const name = row.name;
      const price = Number(row.price);
      if (!name || !Number.isFinite(price)) continue;

      let categoryId: string | null = null;
      const catName = row.category || 'General';
      let cat = await MenuCategory.findOne({ restaurantId, name: catName });
      if (!cat) {
        cat = await MenuCategory.create({ restaurantId, name: catName, sortOrder: 0, isActive: true });
      }
      categoryId = cat.id;

      await MenuItem.create({
        restaurantId,
        categoryId: cat._id,
        name,
        price,
        category: catName,
        description: row.description ?? '',
        preparationTimeMinutes: Number(row.preptime || row.preparationtime || 15),
        isVeg: row.isveg !== '0' && row.isveg?.toLowerCase() !== 'false',
        spicyLevel: Math.min(3, Number(row.spicylevel || 0)) as SpicyLevel,
        calories: row.calories ? Number(row.calories) : null,
        variants: [],
        addOns: [],
        stockStatus: 'in_stock',
        isAvailable: true,
      });
      created.push(name);
    }
    res.json({ imported: created.length, names: created });
  } catch (e) {
    next(e);
  }
}

export async function exportMenuCsv(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurantId = await requireApprovedRestaurantId(req.user!.sub);
    const items = await MenuItem.find({ restaurantId }).sort({ category: 1, name: 1 });
    const header =
      'name,price,category,description,isVeg,spicyLevel,prepTime,calories,stockStatus';
    const rows = items.map(
      (m) =>
        `"${m.name.replace(/"/g, '""')}",${m.price},"${m.category.replace(/"/g, '""')}","${(m.description || '').replace(/"/g, '""')}",${m.isVeg},${m.spicyLevel},${m.preparationTimeMinutes},${m.calories ?? ''},${m.stockStatus}`
    );
    res.json({ csv: [header, ...rows].join('\n') });
  } catch (e) {
    next(e);
  }
}

export async function menuAiSuggestions(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reg = await OwnerRestaurant.findOne({ ownerId: req.user!.sub, approvalStatus: 'approved' });
    const cuisine = reg?.cuisine?.[0] ?? 'Indian';
    const items = reg?.restaurantListingId
      ? await MenuItem.find({ restaurantId: reg.restaurantListingId }).limit(5)
      : [];

    const combos = [
      { title: `${cuisine} lunch combo`, items: ['Main dish', 'Rice/roti', 'Beverage'], suggestedPrice: 299 },
      { title: 'Family pack', items: ['2 mains', '1 starter', 'Dessert'], suggestedPrice: 699 },
    ];
    const pricing = items.map((m) => ({
      itemName: m.name,
      currentPrice: m.price,
      suggestion: Math.round(m.price * 1.05),
      note: 'Try a 5% premium during peak hours',
    }));

    res.json({
      combos,
      pricing,
      note: 'AI suggestions are demo recommendations. Connect a model for live insights.',
    });
  } catch (e) {
    next(e);
  }
}
