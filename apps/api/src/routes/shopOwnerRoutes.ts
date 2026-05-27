import { Router, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { AuthedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as shop from '../controllers/shopOwnerController';
import * as menu from '../controllers/menuManagementController';
import * as dashboard from '../controllers/shopDashboardController';
import * as shopOrders from '../controllers/shopOrderController';
import * as shopCrm from '../controllers/shopCrmController';
import * as shopAnalytics from '../controllers/shopAnalyticsController';
import * as shopOffers from '../controllers/shopOffersController';

const r = Router();

r.use(authMiddleware);

const shopOnly = requireRole('shop_owner');
const adminOnly = requireRole('admin');

const wrap =
  (fn: (req: AuthedRequest, res: import('express').Response, next: import('express').NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    void fn(req as AuthedRequest, res, next);
  };

r.get('/restaurant/mine', shopOnly, wrap(shop.getMyRestaurant));
r.get('/wallet', shopOnly, wrap(shop.getShopWallet));

/** Draft saves per wizard step — full validation runs on submit. */
r.put('/restaurant', shopOnly, wrap(shop.upsertMyRestaurant));

r.post(
  '/restaurant/cover-photo',
  shopOnly,
  [body('dataUrl').trim().notEmpty().withMessage('Image data required')],
  wrap(shop.uploadCoverPhoto)
);

r.post(
  '/restaurant/documents',
  shopOnly,
  [
    body('type').isIn(['gst', 'pan', 'fssai']).withMessage('Invalid document type'),
    body('dataUrl').trim().notEmpty().withMessage('Document data required'),
    body('fileName').optional().trim(),
  ],
  wrap(shop.uploadDocument)
);

r.post('/restaurant/submit', shopOnly, wrap(shop.submitForReview));

r.get('/restaurant/open-status', shopOnly, wrap(shop.getShopOpenStatus));
r.get('/restaurant/customer-visibility', shopOnly, wrap(shop.getCustomerVisibilityPreview));
r.patch(
  '/restaurant/open-status',
  shopOnly,
  [body('isAcceptingOrders').isBoolean().withMessage('isAcceptingOrders must be true or false')],
  wrap(shop.setShopOpenStatus)
);

r.get('/dashboard', shopOnly, wrap(dashboard.getShopDashboard));

r.get('/orders', shopOnly, wrap(shopOrders.listShopOrders));
r.get('/orders/alerts', shopOnly, wrap(shopOrders.getOrderAlerts));
r.get('/orders/kitchen', shopOnly, wrap(shopOrders.getKitchenDisplay));
r.get('/orders/insights', shopOnly, wrap(shopOrders.getShopOrderInsights));
r.get('/orders/:id', shopOnly, wrap(shopOrders.getShopOrder));
r.get('/orders/:id/contact/customer', shopOnly, wrap(shopOrders.getShopOrderCustomerContact));
r.post(
  '/orders/:id/accept',
  shopOnly,
  [body('estimatedPrepMinutes').optional().isInt({ min: 5, max: 120 })],
  wrap(shopOrders.acceptOrder)
);
r.post(
  '/orders/:id/reject',
  shopOnly,
  [body('reason').trim().notEmpty().withMessage('Reject reason required')],
  wrap(shopOrders.rejectOrder)
);
r.patch('/orders/:id/status', shopOnly, wrap(shopOrders.advanceOrderStatus));
r.patch('/orders/:id/notes', shopOnly, wrap(shopOrders.updateShopOrderNotes));
r.post('/orders/:id/print-invoice', shopOnly, wrap(shopOrders.markInvoicePrinted));

r.get('/menu', shopOnly, wrap(menu.getMenuManagement));
r.get('/menu/manage', shopOnly, wrap(menu.getMenuManagement));

r.get('/menu/categories', shopOnly, wrap(menu.listCategories));
r.post(
  '/menu/categories',
  shopOnly,
  [body('name').trim().notEmpty().withMessage('Category name required')],
  wrap(menu.createCategory)
);
r.put('/menu/categories/:categoryId', shopOnly, wrap(menu.updateCategory));
r.delete('/menu/categories/:categoryId', shopOnly, wrap(menu.deleteCategory));

r.post(
  '/menu/items',
  shopOnly,
  [body('name').trim().notEmpty(), body('price').isFloat({ min: 1 })],
  wrap(menu.createMenuItemFull)
);
r.put('/menu/items/:itemId', shopOnly, wrap(menu.updateMenuItemFull));
r.patch('/menu/items/:itemId/availability', shopOnly, wrap(menu.patchMenuItemAvailability));
r.delete('/menu/items/:itemId', shopOnly, wrap(menu.deleteMenuItemFull));

r.post('/menu/bulk/csv', shopOnly, wrap(menu.bulkImportCsv));
r.get('/menu/export/csv', shopOnly, wrap(menu.exportMenuCsv));
r.get('/menu/ai/suggestions', shopOnly, wrap(menu.menuAiSuggestions));

r.get('/crm', shopOnly, wrap(shopCrm.getCrmOverview));
r.get('/crm/customers', shopOnly, wrap(shopCrm.listCrmCustomers));
r.get('/crm/customers/:userId', shopOnly, wrap(shopCrm.getCrmCustomer));
r.patch(
  '/crm/customers/:userId/loyalty',
  shopOnly,
  [body('points').isInt({ min: 0 }).withMessage('Points must be 0 or more')],
  wrap(shopCrm.updateLoyaltyPoints)
);
r.get('/crm/reviews', shopOnly, wrap(shopCrm.listCrmReviews));
r.get('/crm/personalized-offers', shopOnly, wrap(shopCrm.getPersonalizedOffers));

r.get('/analytics', shopOnly, wrap(shopAnalytics.getShopAnalytics));

r.get('/offers', shopOnly, wrap(shopOffers.listOffers));
r.get('/offers/ai-targeting', shopOnly, wrap(shopOffers.getAiCouponTargeting));
r.get('/offers/campaigns', shopOnly, wrap(shopOffers.listCampaigns));
r.post(
  '/offers',
  shopOnly,
  [
    body('title').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('offerType').isIn(['flat', 'percentage', 'free_delivery', 'combo']),
    body('startDate').notEmpty(),
    body('endDate').notEmpty(),
  ],
  wrap(shopOffers.createOffer)
);
r.put('/offers/:id', shopOnly, wrap(shopOffers.updateOffer));
r.delete('/offers/:id', shopOnly, wrap(shopOffers.deleteOffer));
r.patch('/offers/:id/toggle', shopOnly, wrap(shopOffers.toggleOffer));
r.post(
  '/offers/:id/reactivate',
  shopOnly,
  [body('validityDays').optional().isInt({ min: 1, max: 365 })],
  wrap(shopOffers.reactivateOffer)
);

r.get(
  '/admin/restaurant/:listingId/customer-visibility',
  adminOnly,
  wrap(shop.adminCustomerVisibilityPreview)
);

r.get('/restaurant/pending', adminOnly, wrap(shop.listPendingRegistrations));

r.post('/restaurant/:id/approve', adminOnly, wrap(shop.approveRegistration));

r.post(
  '/restaurant/:id/reject',
  adminOnly,
  [body('reason').trim().notEmpty().withMessage('Rejection reason required')],
  wrap(shop.rejectRegistration)
);

export default r;
