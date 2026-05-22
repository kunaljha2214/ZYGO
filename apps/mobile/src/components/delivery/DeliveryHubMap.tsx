import { PartnerHubMap } from '../map/PartnerHubMap';

type Props = {
  online?: boolean;
};

/** Food delivery partner hub map — same tiles as ride captain hub. */
export function DeliveryHubMap({ online }: Props) {
  return <PartnerHubMap online={online} variant="delivery" />;
}
