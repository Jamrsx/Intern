import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { LocateFixed, Map, MapPin, Search, Satellite } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const DEFAULT_LATITUDE = 8.4542;
const DEFAULT_LONGITUDE = 124.6319;
const DEFAULT_CENTER: L.LatLngTuple = [DEFAULT_LATITUDE, DEFAULT_LONGITUDE];
const DEFAULT_RADIUS_METERS = 10;
const MIN_RADIUS_METERS = 1;
const MAX_RADIUS_METERS = 5000;

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export type GeofenceValue = {
    latitude: number;
    longitude: number;
    geofence_radius_meters: number;
};

type SearchResult = {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
};

type MapStyle = 'street' | 'satellite';

type Props = {
    value: GeofenceValue;
    onChange: (value: GeofenceValue) => void;
};

function formatRadius(meters: number): string {
    if (meters >= 1000) {
        const km = meters / 1000;
        return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
    }

    return `${meters} m`;
}

export function CompanyGeofenceMap({ value, onChange }: Props) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const streetLayerRef = useRef<L.TileLayer | null>(null);
    const satelliteLayerRef = useRef<L.TileLayer | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const circleRef = useRef<L.Circle | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [mapStyle, setMapStyle] = useState<MapStyle>('street');

    const updatePosition = useCallback(
        (latitude: number, longitude: number) => {
            onChange({
                latitude,
                longitude,
                geofence_radius_meters: value.geofence_radius_meters,
            });
        },
        [onChange, value.geofence_radius_meters],
    );

    const updateRadius = useCallback(
        (geofence_radius_meters: number) => {
            onChange({
                latitude: value.latitude,
                longitude: value.longitude,
                geofence_radius_meters,
            });
        },
        [onChange, value.latitude, value.longitude],
    );

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return;
        }

        const hasCoords = value.latitude !== 0 || value.longitude !== 0;
        const center: L.LatLngExpression = hasCoords
            ? [value.latitude, value.longitude]
            : DEFAULT_CENTER;

        const map = L.map(mapContainerRef.current, {
            center,
            zoom: hasCoords ? 15 : 13,
        });

        const streetLayer = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            },
        );

        const satelliteLayer = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution:
                    'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
                maxZoom: 19,
            },
        );

        streetLayer.addTo(map);
        streetLayerRef.current = streetLayer;
        satelliteLayerRef.current = satelliteLayer;

        const initialLat = hasCoords ? value.latitude : DEFAULT_LATITUDE;
        const initialLng = hasCoords ? value.longitude : DEFAULT_LONGITUDE;

        const marker = L.marker([initialLat, initialLng], {
            draggable: true,
        }).addTo(map);

        const circle = L.circle([initialLat, initialLng], {
            radius: value.geofence_radius_meters || DEFAULT_RADIUS_METERS,
            color: '#7c3aed',
            fillColor: '#8b5cf6',
            fillOpacity: 0.15,
            weight: 2,
        }).addTo(map);

        marker.on('dragend', () => {
            const position = marker.getLatLng();
            updatePosition(position.lat, position.lng);
        });

        map.on('click', (event: L.LeafletMouseEvent) => {
            marker.setLatLng(event.latlng);
            updatePosition(event.latlng.lat, event.latlng.lng);
        });

        if (!hasCoords) {
            updatePosition(initialLat, initialLng);
        }

        mapRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;

        window.setTimeout(() => {
            map.invalidateSize();
        }, 100);

        console.log('Company geofence map initialized', { center });

        return () => {
            map.remove();
            mapRef.current = null;
            streetLayerRef.current = null;
            satelliteLayerRef.current = null;
            markerRef.current = null;
            circleRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const streetLayer = streetLayerRef.current;
        const satelliteLayer = satelliteLayerRef.current;

        if (!map || !streetLayer || !satelliteLayer) {
            return;
        }

        if (mapStyle === 'street') {
            if (map.hasLayer(satelliteLayer)) {
                map.removeLayer(satelliteLayer);
            }

            if (!map.hasLayer(streetLayer)) {
                streetLayer.addTo(map);
            }
        } else {
            if (map.hasLayer(streetLayer)) {
                map.removeLayer(streetLayer);
            }

            if (!map.hasLayer(satelliteLayer)) {
                satelliteLayer.addTo(map);
            }
        }

        console.log('Geofence map style switched', { mapStyle });
    }, [mapStyle]);

    useEffect(() => {
        if (!markerRef.current || !circleRef.current || !mapRef.current) {
            return;
        }

        const latLng: L.LatLngExpression = [
            value.latitude,
            value.longitude,
        ];

        markerRef.current.setLatLng(latLng);
        circleRef.current.setLatLng(latLng);
        circleRef.current.setRadius(value.geofence_radius_meters);
    }, [value.latitude, value.longitude, value.geofence_radius_meters]);

    const runSearch = useCallback((query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const trimmed = query.trim();

        if (trimmed.length < 3) {
            setSearchResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);

            try {
                const url = new URL(
                    'https://nominatim.openstreetmap.org/search',
                );
                url.searchParams.set('format', 'json');
                url.searchParams.set('q', trimmed);
                url.searchParams.set('limit', '5');
                url.searchParams.set('countrycodes', 'ph');

                const response = await fetch(url.toString(), {
                    headers: {
                        Accept: 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const results = (await response.json()) as SearchResult[];
                setSearchResults(results);
                console.log('Geofence location search results', {
                    count: results.length,
                });
            } catch (error) {
                console.log('Geofence location search failed', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 450);
    }, []);

    const selectSearchResult = (result: SearchResult) => {
        const latitude = Number.parseFloat(result.lat);
        const longitude = Number.parseFloat(result.lon);

        updatePosition(latitude, longitude);
        mapRef.current?.setView([latitude, longitude], 16);
        setSearchQuery(result.display_name);
        setSearchResults([]);
        setLocationError(null);
        console.log('Geofence location selected', {
            latitude,
            longitude,
            label: result.display_name,
        });
    };

    const useCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError(
                'Your browser does not support location services.',
            );
            return;
        }

        setIsLocating(true);
        setLocationError(null);
        setSearchResults([]);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                updatePosition(latitude, longitude);
                mapRef.current?.setView([latitude, longitude], 17);
                setSearchQuery('Current location');
                setIsLocating(false);

                console.log('Geofence map set to current location', {
                    latitude,
                    longitude,
                    accuracyMeters: position.coords.accuracy,
                });
            },
            (error) => {
                setIsLocating(false);

                const message =
                    error.code === error.PERMISSION_DENIED
                        ? 'Location permission denied. Allow location access in your browser settings.'
                        : error.code === error.POSITION_UNAVAILABLE
                          ? 'Unable to determine your location. Check that GPS or location services are enabled.'
                          : error.code === error.TIMEOUT
                            ? 'Location request timed out. Try again in an open area.'
                            : 'Could not get your current location.';

                setLocationError(message);
                console.log('Current location failed', {
                    code: error.code,
                    message: error.message,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            },
        );
    }, [updatePosition]);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <Label htmlFor="geofence-search" className="mb-0">
                        Search location
                    </Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={useCurrentLocation}
                        disabled={isLocating}
                    >
                        <LocateFixed className="size-3.5" />
                        {isLocating ? 'Locating…' : 'Use current location'}
                    </Button>
                </div>
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="geofence-search"
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            runSearch(event.target.value);
                        }}
                        placeholder="Search address or place name in the Philippines"
                        className="pl-9"
                    />
                </div>
                {isSearching ? (
                    <p className="text-xs text-muted-foreground">Searching…</p>
                ) : null}
                {locationError ? (
                    <p className="text-xs text-destructive">{locationError}</p>
                ) : null}
                {searchResults.length > 0 ? (
                    <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-card text-sm shadow-sm">
                        {searchResults.map((result) => (
                            <li key={result.place_id}>
                                <button
                                    type="button"
                                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/60"
                                    onClick={() => selectSearchResult(result)}
                                >
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                                    <span>{result.display_name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm text-muted-foreground">
                    Map view
                </Label>
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-8 gap-1.5 px-3',
                            mapStyle === 'street' &&
                                'bg-background shadow-sm hover:bg-background',
                        )}
                        onClick={() => setMapStyle('street')}
                    >
                        <Map className="size-3.5" />
                        Street
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-8 gap-1.5 px-3',
                            mapStyle === 'satellite' &&
                                'bg-background shadow-sm hover:bg-background',
                        )}
                        onClick={() => setMapStyle('satellite')}
                    >
                        <Satellite className="size-3.5" />
                        Satellite
                    </Button>
                </div>
            </div>

            <div
                ref={mapContainerRef}
                className="h-[min(70vh,520px)] min-h-[400px] w-full overflow-hidden rounded-xl border border-border"
            />

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="geofence-radius">
                        Geofence radius
                    </Label>
                    <span className="text-sm font-medium text-foreground">
                        {formatRadius(value.geofence_radius_meters)}
                    </span>
                </div>
                <input
                    id="geofence-radius"
                    type="range"
                    min={MIN_RADIUS_METERS}
                    max={MAX_RADIUS_METERS}
                    step={1}
                    value={value.geofence_radius_meters}
                    onChange={(event) =>
                        updateRadius(Number.parseInt(event.target.value, 10))
                    }
                    className="h-2 w-full cursor-pointer accent-brand"
                />
                <p className="text-xs text-muted-foreground">
                    Search, use your current location, drag the pin, or click
                    the map to set the center. Students must be inside this
                    circle to time in or out.
                </p>
            </div>
        </div>
    );
}

export const defaultGeofenceValue = (): GeofenceValue => ({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    geofence_radius_meters: DEFAULT_RADIUS_METERS,
});
