import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { MenuItem, isMenuItemActiveNow } from '../models/MenuItem';

export async function listRestaurants(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search, cuisine } = req.query as { search?: string; cuisine?: string };
    // $ne: false includes legacy rows where isAcceptingOrders was never set (treated as open).
    const filter: Record<string, unknown> = {
      isActive: true,
      isAcceptingOrders: { $ne: false },
    };
    if (search) {
      filter.name = { $regex: new RegExp(search, 'i') };
    }
    if (cuisine) {
      filter.cuisine = cuisine;
    }
    const list = await Restaurant.find(filter).sort({ rating: -1 }).lean();
    res.json(
      list.map((r) => ({
        id: r._id,
        name: r.name,
        image: r.image,
        cuisine: r.cuisine,
        rating: r.rating,
        location: r.location,
      }))
    );
  } catch (e) {
    next(e);
  }
}

export async function getRestaurant(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const r = await Restaurant.findById(req.params.id).lean();
    if (!r) {
      next(createError(404, 'Restaurant not found'));
      return;
    }
    const menu = await MenuItem.find({ restaurantId: r._id })
      .sort({ category: 1, name: 1 })
      .lean();
    const visible = menu.filter((m) => isMenuItemActiveNow(m));
    res.json({
      id: r._id,
      name: r.name,
      image: r.image,
      cuisine: r.cuisine,
      rating: r.rating,
      location: r.location,
      menu: visible.map((m) => ({
        id: m._id,
        name: m.name,
        price: m.price,
        category: m.category,
        description: m.description,
        imageUrl: m.imageUrl,
        isVeg: m.isVeg,
        spicyLevel: m.spicyLevel,
        preparationTimeMinutes: m.preparationTimeMinutes,
        calories: m.calories,
        variants: m.variants,
        addOns: m.addOns,
      })),
    });
  } catch (e) {
    next(e);
  }
}
