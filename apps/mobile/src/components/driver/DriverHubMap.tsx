import { PartnerHubMap } from '../map/PartnerHubMap';

type Props = {
  online?: boolean;
};

/** Ride captain hub map — see `PartnerHubMap`. */
export function DriverHubMap({ online }: Props) {
  return <PartnerHubMap online={online} variant="ride" />;
}
