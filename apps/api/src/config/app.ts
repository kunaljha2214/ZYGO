export const JWT_EXPIRES_DAYS = Number(process.env.JWT_EXPIRES_DAYS || 7);

export function vehicleTypes() {
  return [
    { id: 'bike', label: 'Bike', baseFare: 25, perKm: 8, perMin: 1.5 },
    { id: 'auto', label: 'Auto', baseFare: 40, perKm: 12, perMin: 2 },
    { id: 'car', label: 'Car', baseFare: 60, perKm: 18, perMin: 2.5 },
  ];
}

export function getVehicleType(id: string) {
  return vehicleTypes().find((v) => v.id === id);
}
