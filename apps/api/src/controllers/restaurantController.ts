import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { MenuItem, isMenuItemActiveNow } from '../models/MenuItem';
import { haversineKm, normalizeLatLng } from '../utils/geo';

const DEFAULT_RADIUS_KM = 7;

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
    const latRaw = req.query.lat;
    const lngRaw = req.query.lng;
    const radiusRaw = req.query.radiusKm;
    const hasGeo =
      latRaw != null &&
      lngRaw != null &&
      String(latRaw).trim() !== '' &&
      String(lngRaw).trim() !== '';

    let customerPoint: { lat: number; lng: number } | null = null;
    let radiusKm = DEFAULT_RADIUS_KM;
    if (hasGeo) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        next(createError(400, 'Invalid lat or lng'));
        return;
      }
      customerPoint = normalizeLatLng({ lat, lng });
      const r = Number(radiusRaw);
      if (Number.isFinite(r) && r > 0 && r <= 50) {
        radiusKm = r;
      }
    }

    const list = await Restaurant.find(filter).sort({ rating: -1 }).lean();

    const mapped = list
      .map((r) => {
        const [lng, lat] = r.location.coordinates;
        const restPoint = normalizeLatLng({ lat, lng });
        const distanceKm = customerPoint
          ? Math.round(haversineKm(customerPoint, restPoint) * 100) / 100
          : undefined;
        return {
          id: r._id,
          name: r.name,
          image: r.image,
          cuisine: r.cuisine,
          rating: r.rating,
          location: r.location,
          distanceKm,
        };
      })
      .filter((r) => {
        if (!customerPoint || r.distanceKm == null) return true;
        return r.distanceKm <= radiusKm;
      })
      .sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) {
          return a.distanceKm - b.distanceKm;
        }
        return (b.rating ?? 0) - (a.rating ?? 0);
      });

    res.json(mapped);
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
