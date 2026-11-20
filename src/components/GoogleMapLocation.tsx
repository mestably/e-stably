/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  APIProvider,
  Map as GoogleMapView,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LocateFixed,
} from 'lucide-react';
import { GeoCoordinates } from '../types';

export const DEFAULT_JEDDAH_COORDS: GeoCoordinates = { lat: 21.4858, lng: 39.1925 };
export const DEFAULT_JEDDAH_LABEL = 'جدة، المملكة العربية السعودية';

export const SAUDI_CITIES: Record<string, { lat: number; lng: number; name: string; label: string }> = {
  jeddah: { lat: 21.4858, lng: 39.1925, name: 'جدة، المملكة العربية السعودية', label: 'جدة (الافتراضي)' },
  riyadh: { lat: 24.7136, lng: 46.6753, name: 'الرياض، المملكة العربية السعودية', label: 'الرياض' },
  mecca: { lat: 21.3891, lng: 39.8579, name: 'مكة المكرمة، المملكة العربية السعودية', label: 'مكة المكرمة' },
  medina: { lat: 24.5247, lng: 39.5692, name: 'المدينة المنورة، المملكة العربية السعودية', label: 'المدينة المنورة' },
  dammam: { lat: 26.4207, lng: 50.0888, name: 'الدمام، المملكة العربية السعودية', label: 'الدمام' },
  taif: { lat: 21.2854, lng: 40.4244, name: 'الطائف، المملكة العربية السعودية', label: 'الطائف' },
};

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
const ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
const DEMO_MAP_ID = 'DEMO_MAP_ID';

function isQuotaError(err: unknown): boolean {
  const msg = String((err as any)?.message || (err as any)?.status || err || '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  );
}

/**
 * Root Google Maps APIProvider wrapper placed once in App.tsx.
 */
export function GoogleMapsAppProvider({ children }: { children: ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <>{children}</>;
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      language="ar"
      region="SA"
      libraries={['marker', 'places']}
    >
      {children}
    </APIProvider>
  );
}

/**
 * Helper component inside <GoogleMapView> to smoothly pan/zoom when external coordinates change.
 */
function MapCameraSync({ center, zoom = 13 }: { center: GeoCoordinates; zoom?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: center.lat, lng: center.lng });
    if (zoom) {
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 10) {
        map.setZoom(zoom);
      }
    }
  }, [map, center.lat, center.lng, zoom]);

  return null;
}

/**
 * Helper component to auto-fit bounds for multi-point maps (e.g. directory or transport pickup+delivery).
 */
function MapBoundsFitter({ points }: { points: GeoCoordinates[] }) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !coreLib || points.length === 0) return;

    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(12);
      return;
    }

    try {
      const bounds = new coreLib.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
    } catch {
      // Fallback to first point
      map.panTo(points[0]);
    }
  }, [map, coreLib, points]);

  return null;
}

/**
 * Modern Places API (New) Autocomplete search box using AutocompleteSuggestion + Place.fetchFields.
 */
function PlacesSearchInput({
  onSelectPlace,
  biasCenter,
}: {
  onSelectPlace: (coords: GeoCoordinates, formattedAddress: string) => void;
  biasCenter: GeoCoordinates;
}) {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearchError('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setIsSearching(true);
        setSearchError('');

        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['sa'],
          locationBias: {
            center: { lat: biasCenter.lat, lng: biasCenter.lng },
            radius: 50000,
          },
        };

        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(res?.suggestions || []);
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          setSearchError('تم الوصول للحد المسموح من البحث مؤقتاً. يمكنك النقر مباشرة على الخريطة لتحديد موقعك.');
        } else {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [placesLib, query, biasCenter.lat, biasCenter.lng]);

  const handlePickSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion?.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
      });
      const loc = place.location;
      if (loc) {
        const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
        const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
        const label = place.formattedAddress || place.displayName || suggestion.placePrediction.text?.text || '';
        onSelectPlace({ lat, lng }, label);
      }
      setQuery('');
      setSuggestions([]);
      sessionTokenRef.current = null;
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن حي أو شارع أو موقع في جدة والمملكة..."
          className="w-full text-[11px] py-2 pr-8 pl-8 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-navy"
        />
        {isSearching && (
          <Loader2 className="w-3.5 h-3.5 text-navy animate-spin absolute left-3" />
        )}
      </div>
      {searchError && (
        <p className="text-[10px] text-amber-700 mt-1 font-medium">{searchError}</p>
      )}
      {suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((sug, idx) => (
            <li
              key={idx}
              onClick={() => handlePickSuggestion(sug)}
              className="px-3 py-2 text-[11px] text-slate-700 hover:bg-blue-50 cursor-pointer flex items-center gap-2 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
              <span className="truncate">{sug.placePrediction?.text?.text || 'موقع مقترح'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapsApiGuard({ children }: { children: ReactNode }) {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [status]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>مفتاح خرائط جوجل غير مهيأ حالياً في البيئة. يرجى حفظ الإحداثيات أو العنوان يدوياً.</span>
      </div>
    );
  }

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>تعذر تحميل خريطة جوجل في الوقت الحالي. يمكنك كتابة العنوان يدوياً أو المحاولة لاحقاً.</span>
      </div>
    );
  }

  return <>{children}</>;
}

export interface GoogleMapLocationPickerProps {
  title?: string;
  address: string;
  onAddressChange: (address: string) => void;
  coords?: GeoCoordinates;
  onCoordsChange: (coords: GeoCoordinates) => void;
  addressLabel?: string;
  placeholder?: string;
  required?: boolean;
  accentColor?: 'navy' | 'gold' | 'emerald';
  defaultShowMap?: boolean;
}

/**
 * Interactive location picker component with Saudi city presets (Jeddah default),
 * the explicit "تحديد مكانك على خريطة جوجل" option, GPS button, Places search, and draggable AdvancedMarker.
 */
export function GoogleMapLocationPicker({
  title = 'الموقع وتحديد المكان على خريطة جوجل',
  address,
  onAddressChange,
  coords,
  onCoordsChange,
  addressLabel = 'اسم المدينة / الحي / العنوان التفصيلي',
  placeholder = 'مثال: جدة - حي أبحر الشمالية - طريق الملك',
  required = false,
  accentColor = 'navy',
  defaultShowMap = true,
}: GoogleMapLocationPickerProps) {
  const activeCoords: GeoCoordinates = coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
    ? coords
    : DEFAULT_JEDDAH_COORDS;

  const [isMapOpen, setIsMapOpen] = useState(defaultShowMap);
  const [selectedPreset, setSelectedPreset] = useState<string>('map');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [zoom, setZoom] = useState(12);

  const handleCitySelect = (cityKey: string) => {
    const city = SAUDI_CITIES[cityKey];
    if (!city) return;
    setSelectedPreset(cityKey);
    onAddressChange(city.name);
    onCoordsChange({ lat: city.lat, lng: city.lng });
    setZoom(12);
  };

  const handleSelectCustomGoogleMapOption = () => {
    setSelectedPreset('map');
    setIsMapOpen(true);
    if (!address.trim()) {
      onAddressChange(DEFAULT_JEDDAH_LABEL);
    }
    if (!coords) {
      onCoordsChange(DEFAULT_JEDDAH_COORDS);
    }
  };

  const handleMapClick = useCallback(
    (ev: MapMouseEvent) => {
      const latLng = ev.detail?.latLng;
      if (!latLng) return;
      const newCoords = { lat: Number(latLng.lat.toFixed(6)), lng: Number(latLng.lng.toFixed(6)) };
      setSelectedPreset('map');
      onCoordsChange(newCoords);
      if (!address.trim() || Object.values(SAUDI_CITIES).some((c) => c.name === address.trim())) {
        onAddressChange(`موقع محدد على خريطة جوجل (${newCoords.lat}, ${newCoords.lng})`);
      }
    },
    [address, onAddressChange, onCoordsChange]
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : Number(e.latLng.lat);
      const lng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : Number(e.latLng.lng);
      const newCoords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      setSelectedPreset('map');
      onCoordsChange(newCoords);
      if (!address.trim() || address.startsWith('موقع محدد على خريطة جوجل')) {
        onAddressChange(`موقع محدد على خريطة جوجل (${newCoords.lat}, ${newCoords.lng})`);
      }
    },
    [address, onAddressChange, onCoordsChange]
  );

  const handleDetectCurrentLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('المتصفح لا يدعم تحديد الموقع الجغرافي (GPS).');
      return;
    }
    setIsLocatingGps(true);
    setIsMapOpen(true);
    setSelectedPreset('map');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        onCoordsChange(newCoords);
        setZoom(15);
        if (!address.trim() || address === DEFAULT_JEDDAH_LABEL || address.startsWith('موقع محدد')) {
          onAddressChange(`موقعي الحالي (${newCoords.lat}, ${newCoords.lng})`);
        }
        setIsLocatingGps(false);
      },
      () => {
        setGpsError('تعذر الوصول لموقعك الحالي. يمكنك النقر مباشرة على خريطة جوجل لتحديد المكان.');
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const borderAccent =
    accentColor === 'gold'
      ? 'border-amber-200 bg-amber-50/40'
      : accentColor === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/40'
      : 'border-slate-200 bg-slate-50/60';

  return (
    <div className={`space-y-3 border p-3.5 sm:p-4 rounded-2xl ${borderAccent}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-navy flex items-center gap-1.5">
          <MapPin className={`w-4 h-4 shrink-0 ${accentColor === 'gold' ? 'text-gold' : 'text-navy'}`} />
          <span>{title}</span>
        </span>
        <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
          الافتراضي: جدة، السعودية
        </span>
      </div>

      {/* Places / Cities list including explicit "تحديد مكانك على خريطة جوجل" option */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-500 block">اختر المكان أو المحل السريع:</span>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(SAUDI_CITIES).map(([key, city]) => {
            const isSelected = selectedPreset === key || address.trim() === city.name;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCitySelect(key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-navy text-white border-navy shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-gold text-slate-700'
                }`}
              >
                {city.label}
              </button>
            );
          })}

          {/* Mandatory explicit place option: "تحديد مكانك على خريطة جوجل" */}
          <button
            type="button"
            onClick={handleSelectCustomGoogleMapOption}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border flex items-center gap-1 ${
              isMapOpen && selectedPreset === 'map'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Navigation className="w-3 h-3 shrink-0" />
            <span>تحديد مكانك على خريطة جوجل</span>
          </button>
        </div>
      </div>

      {/* Interactive Google Map Box */}
      {isMapOpen && (
        <div className="space-y-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>اضغط على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة</span>
            </span>
            <button
              type="button"
              onClick={handleDetectCurrentLocation}
              disabled={isLocatingGps}
              className="text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-navy border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition disabled:opacity-60"
            >
              {isLocatingGps ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <LocateFixed className="w-3 h-3" />
              )}
              <span>تحديد موقعي (GPS)</span>
            </button>
          </div>

          {gpsError && (
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              {gpsError}
            </p>
          )}

          <MapsApiGuard>
            <PlacesSearchInput
              biasCenter={activeCoords}
              onSelectPlace={(newCoords, formatted) => {
                setSelectedPreset('map');
                onCoordsChange(newCoords);
                onAddressChange(formatted);
                setZoom(15);
              }}
            />

            <div className="w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-200 relative">
              <GoogleMapView
                defaultCenter={DEFAULT_JEDDAH_COORDS}
                defaultZoom={zoom}
                mapId={DEMO_MAP_ID}
                gestureHandling="greedy"
                internalUsageAttributionIds={ATTRIBUTION_IDS}
                onClick={handleMapClick}
                style={{ width: '100%', height: '100%' }}
              >
                <MapCameraSync center={activeCoords} zoom={zoom} />
                <AdvancedMarker
                  position={activeCoords}
                  draggable={true}
                  onDragEnd={handleMarkerDragEnd}
                  title="اسحب لتعديل الموقع الدقيق"
                >
                  <Pin background="#1b365d" borderColor="#d4af37" glyphColor="#d4af37" scale={1.15} />
                </AdvancedMarker>
              </GoogleMapView>
            </div>
          </MapsApiGuard>

          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5 flex-wrap">
            <span className="font-mono" dir="ltr">
              📍 {activeCoords.lat.toFixed(5)}, {activeCoords.lng.toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${activeCoords.lat},${activeCoords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy hover:underline font-bold flex items-center gap-1"
            >
              <span>معاينة في خرائط جوجل</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Text address input */}
      <div className="space-y-1">
        <label className="block text-[10px] font-semibold text-slate-600">
          {addressLabel} {required ? '*' : ''}
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy bg-white"
        />
      </div>
    </div>
  );
}

export interface ViewerMarkerItem {
  id: string;
  label: string;
  subtitle?: string;
  coords: GeoCoordinates;
  color?: 'navy' | 'gold' | 'emerald';
}

/**
 * Interactive Google Map viewer used in DetailModal for Stables, Shelters, and Transport.
 */
export function GoogleMapViewer({
  markers,
  heightClass = 'h-56 sm:h-64',
}: {
  markers: ViewerMarkerItem[];
  heightClass?: string;
}) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const markerElementsRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement | null>>({});

  const validMarkers = markers.filter(
    (m) => m.coords && Number.isFinite(m.coords.lat) && Number.isFinite(m.coords.lng)
  );
  const displayMarkers: ViewerMarkerItem[] =
    validMarkers.length > 0
      ? validMarkers
      : [
          {
            id: 'default-jeddah',
            label: DEFAULT_JEDDAH_LABEL,
            subtitle: 'الموقع الافتراضي على خريطة جوجل',
            coords: DEFAULT_JEDDAH_COORDS,
            color: 'navy',
          },
        ];

  const primaryCoords = displayMarkers[0].coords;
  const activeMarkerItem = displayMarkers.find((m) => m.id === selectedMarkerId) || null;
  const activeMarkerElement = selectedMarkerId ? markerElementsRef.current[selectedMarkerId] : null;

  return (
    <div className="space-y-2">
      <MapsApiGuard>
        <div className={`w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 relative`}>
          <GoogleMapView
            defaultCenter={primaryCoords}
            defaultZoom={12}
            mapId={DEMO_MAP_ID}
            gestureHandling="greedy"
            internalUsageAttributionIds={ATTRIBUTION_IDS}
            style={{ width: '100%', height: '100%' }}
          >
            <MapBoundsFitter points={displayMarkers.map((m) => m.coords)} />
            {displayMarkers.map((m) => {
              const bg = m.color === 'gold' ? '#d4af37' : m.color === 'emerald' ? '#059669' : '#1b365d';
              const glyph = m.color === 'gold' ? '#1b365d' : '#ffffff';
              return (
                <AdvancedMarker
                  key={m.id}
                  ref={(el) => {
                    markerElementsRef.current[m.id] = el;
                  }}
                  position={m.coords}
                  title={m.label}
                  onClick={() => setSelectedMarkerId(m.id)}
                >
                  <Pin background={bg} borderColor="#ffffff" glyphColor={glyph} scale={1.1} />
                </AdvancedMarker>
              );
            })}

            {activeMarkerItem && activeMarkerElement && (
              <InfoWindow anchor={activeMarkerElement} onCloseClick={() => setSelectedMarkerId(null)}>
                <div className="p-1 text-right min-w-[160px]" dir="rtl">
                  <p className="text-xs font-extrabold text-slate-900">{activeMarkerItem.label}</p>
                  {activeMarkerItem.subtitle && (
                    <p className="text-[10px] text-slate-600 mt-0.5">{activeMarkerItem.subtitle}</p>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeMarkerItem.coords.lat},${activeMarkerItem.coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline mt-1.5"
                  >
                    <span>الاتجاهات في خرائط جوجل</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </InfoWindow>
            )}
          </GoogleMapView>
        </div>
      </MapsApiGuard>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {displayMarkers.map((m) => (
          <a
            key={m.id}
            href={`https://www.google.com/maps/search/?api=1&query=${m.coords.lat},${m.coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-navy hover:text-gold font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition"
          >
            <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>فتح {displayMarkers.length > 1 ? m.label : 'الموقع'} في خرائط جوجل</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

export interface DirectoryMapPin {
  id: string;
  title: string;
  subtitle?: string;
  locationText?: string;
  coords?: GeoCoordinates;
  rawItem: any;
}

/**
 * Interactive Google Map overview panel for Stables, Shelters, and Transport sections.
 * Centered by default on Jeddah, Saudi Arabia (21.4858, 39.1925).
 */
export function GoogleMapsDirectoryPanel({
  sectionTitle,
  items,
  onSelectItem,
  accentLabel = 'جدة، المملكة العربية السعودية',
}: {
  sectionTitle: string;
  items: DirectoryMapPin[];
  onSelectItem: (rawItem: any) => void;
  accentLabel?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const markerElementsRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement | null>>({});

  const pinsWithCoords = items.map((it) => ({
    ...it,
    resolvedCoords:
      it.coords && Number.isFinite(it.coords.lat) && Number.isFinite(it.coords.lng)
        ? it.coords
        : DEFAULT_JEDDAH_COORDS,
    hasExactCoords: Boolean(it.coords && Number.isFinite(it.coords.lat) && Number.isFinite(it.coords.lng)),
  }));

  const activePin = pinsWithCoords.find((p) => p.id === selectedPinId) || null;
  const activeMarkerElement = selectedPinId ? markerElementsRef.current[selectedPinId] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
      <div
        onClick={() => setIsExpanded((v) => !v)}
        className="px-4 py-3 bg-gradient-to-l from-slate-50 to-white border-b border-slate-100 flex items-center justify-between gap-2 cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold text-navy truncate">
              خريطة جوجل - {sectionTitle}
            </h3>
            <p className="text-[10px] text-slate-500 truncate">
              الموقع الافتراضي: {accentLabel} • ({pinsWithCoords.length} موقع معروض)
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-[11px] font-bold text-navy bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition cursor-pointer"
        >
          <span>{isExpanded ? 'إخفاء الخريطة' : 'عرض خريطة جوجل'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3">
          <MapsApiGuard>
            <div className="w-full h-56 sm:h-72 rounded-xl overflow-hidden border border-slate-200 relative">
              <GoogleMapView
                defaultCenter={DEFAULT_JEDDAH_COORDS}
                defaultZoom={11}
                mapId={DEMO_MAP_ID}
                gestureHandling="greedy"
                internalUsageAttributionIds={ATTRIBUTION_IDS}
                style={{ width: '100%', height: '100%' }}
              >
                {pinsWithCoords.map((pin) => (
                  <AdvancedMarker
                    key={pin.id}
                    ref={(el) => {
                      markerElementsRef.current[pin.id] = el;
                    }}
                    position={pin.resolvedCoords}
                    title={pin.title}
                    onClick={() => setSelectedPinId(pin.id)}
                  >
                    <Pin
                      background={pin.hasExactCoords ? '#1b365d' : '#d4af37'}
                      borderColor="#ffffff"
                      glyphColor={pin.hasExactCoords ? '#d4af37' : '#1b365d'}
                      scale={1.05}
                    />
                  </AdvancedMarker>
                ))}

                {activePin && activeMarkerElement && (
                  <InfoWindow anchor={activeMarkerElement} onCloseClick={() => setSelectedPinId(null)}>
                    <div className="p-1 text-right max-w-[200px] space-y-1" dir="rtl">
                      <p className="text-xs font-extrabold text-slate-900 leading-snug">{activePin.title}</p>
                      {activePin.locationText && (
                        <p className="text-[10px] text-slate-600">{activePin.locationText}</p>
                      )}
                      {activePin.subtitle && (
                        <p className="text-[10px] text-emerald-700 font-bold">{activePin.subtitle}</p>
                      )}
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPinId(null);
                            onSelectItem(activePin.rawItem);
                          }}
                          className="bg-navy text-white text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMapView>
            </div>
          </MapsApiGuard>
        </div>
      )}
    </div>
  );
}
