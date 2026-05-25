import { FoodOrder, type IFoodOrder } from '../models/FoodOrder';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { Restaurant } from '../models/Restaurant';
import { DeliveryEarning } from '../models/DeliveryEarning';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { RestaurantEarning } from '../models/RestaurantEarning';
import { User } from '../models/User';

/** Credit partner wallets when delivery completes (manual weekly payout later). */
export async function settleFoodOrderOnDelivered(order: IFoodOrder): Promise<void> {
  if (order.settlementCompletedAt) return;

  const riderAmount = order.riderEarnings ?? order.estimatedRiderEarnings ?? 35;
  if (order.deliveryPartnerId) {
    const existing = await DeliveryEarning.findOne({ orderId: order._id });
    if (!existing) {
      await DeliveryEarning.create({
        partnerId: order.deliveryPartnerId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: riderAmount,
        type: 'delivery',
        status: 'pending',
      });
      const profile = await DeliveryPartnerProfile.findOne({ partnerId: order.deliveryPartnerId });
      if (profile) {
        profile.walletPending += riderAmount;
        profile.walletTotalEarned += riderAmount;
        profile.totalDeliveries += 1;
        await profile.save();
      }
      await User.findByIdAndUpdate(order.deliveryPartnerId, {
        isDeliveryBusy: false,
        activeDeliveryOrderId: null,
      });
    }
  }

  const restaurantAmount = order.restaurantEarnings ?? 0;
  if (restaurantAmount > 0) {
    const restaurant = await Restaurant.findById(order.restaurantId).select('ownerId').lean();
    const ownerId = restaurant?.ownerId;
    if (ownerId) {
      const existing = await RestaurantEarning.findOne({ orderId: order._id });
      if (!existing) {
        await RestaurantEarning.create({
          ownerId,
          restaurantId: order.restaurantId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: restaurantAmount,
          status: 'pending',
        });
        await OwnerRestaurant.findOneAndUpdate(
          { ownerId },
          { $inc: { walletPending: restaurantAmount, walletTotalEarned: restaurantAmount } }
        );
      }
    }
  }

  await FoodOrder.updateOne(
    { _id: order._id },
    { settlementCompletedAt: new Date() }
  );
}
