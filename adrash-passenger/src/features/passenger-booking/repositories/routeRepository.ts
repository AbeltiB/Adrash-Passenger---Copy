import type { PickupLocationDTO, RouteDTO } from '../dtos/bookingDtos';
import { getData, getPage } from '../services/apiEnvelope';
export class RouteRepository { list(page = 1, pageSize = 20, signal?: AbortSignal) { return getPage<RouteDTO>('/routes', { activeOnly: true, page, pageSize }, signal); } detail(routeId: string, signal?: AbortSignal) { return getData<RouteDTO>(`/routes/${routeId}`, undefined, signal); } pickupLocations(routeId: string, signal?: AbortSignal) { return getPage<PickupLocationDTO>(`/routes/${routeId}/pickup-locations`, undefined, signal).then((p) => p.items); } }
export const routeRepository = new RouteRepository();
