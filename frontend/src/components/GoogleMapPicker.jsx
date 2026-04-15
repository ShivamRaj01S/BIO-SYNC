import { useEffect, useMemo, useRef, useState } from 'react';
import { getStoredClientLocation, saveClientLocation } from '../utils/location.js';

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-javascript-api';

let googleMapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key.'));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    const handleLoad = () => {
      if (window.google?.maps?.Map) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps did not initialize correctly.'));
      }
    };

    const handleError = () => {
      googleMapsPromise = null;
      reject(new Error('Google Maps failed to load.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function normalizeCoordinates(value) {
  if (Array.isArray(value) && value.length === 2) {
    const [longitude, latitude] = value;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return [Number(longitude), Number(latitude)];
    }
  }

  return getStoredClientLocation();
}

export default function GoogleMapPicker({
  title = 'Location picker',
  description = 'Search on Google Maps, click the map, or use your current location.',
  value,
  address = '',
  onChange,
  onAddressSelect,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const [loadingMap, setLoadingMap] = useState(Boolean(apiKey));
  const [locating, setLocating] = useState(false);

  const coordinates = useMemo(() => normalizeCoordinates(value), [value]);

  const syncSelection = (longitude, latitude, nextAddress = null) => {
    const nextCoordinates = [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))];

    saveClientLocation(nextCoordinates);
    onChange?.(nextCoordinates);

    if (nextAddress && onAddressSelect) {
      onAddressSelect(nextAddress);
    }

    if (markerRef.current) {
      markerRef.current.setPosition({ lng: nextCoordinates[0], lat: nextCoordinates[1] });
    }

    if (mapRef.current) {
      mapRef.current.panTo({ lng: nextCoordinates[0], lat: nextCoordinates[1] });
    }
  };

  useEffect(() => {
    if (!searchInputRef.current) {
      return;
    }

    if (document.activeElement !== searchInputRef.current) {
      searchInputRef.current.value = address || '';
    }
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    if (!apiKey) {
      setLoadingMap(false);
      setLoadError('');
      return undefined;
    }

    if (!mapContainerRef.current) {
      return undefined;
    }

    setLoadingMap(true);

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const center = { lng: coordinates[0], lat: coordinates[1] };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapContainerRef.current, {
            center,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          markerRef.current = new maps.Marker({
            map: mapRef.current,
            position: center,
            draggable: true,
          });

          mapRef.current.addListener('click', (event) => {
            const latitude = event.latLng?.lat?.();
            const longitude = event.latLng?.lng?.();
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              syncSelection(longitude, latitude);
            }
          });

          markerRef.current.addListener('dragend', (event) => {
            const latitude = event.latLng?.lat?.();
            const longitude = event.latLng?.lng?.();
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              syncSelection(longitude, latitude);
            }
          });

          if (searchInputRef.current && maps.places?.Autocomplete) {
            autocompleteRef.current = new maps.places.Autocomplete(searchInputRef.current, {
              fields: ['formatted_address', 'geometry', 'name'],
            });

            autocompleteRef.current.addListener('place_changed', () => {
              const place = autocompleteRef.current?.getPlace?.();
              const latitude = place?.geometry?.location?.lat?.();
              const longitude = place?.geometry?.location?.lng?.();

              if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return;
              }

              syncSelection(
                longitude,
                latitude,
                place.formatted_address || place.name || searchInputRef.current?.value || ''
              );

              if (mapRef.current) {
                mapRef.current.setZoom(15);
              }
            });
          }
        } else {
          mapRef.current.setCenter(center);
          markerRef.current?.setPosition(center);
        }

        setLoadError('');
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error.message || 'Google Maps could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMap(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, coordinates]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLoadError('This browser does not support geolocation.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        syncSelection(position.coords.longitude, position.coords.latitude);
        if (mapRef.current) {
          mapRef.current.setZoom(15);
        }
        setLocating(false);
      },
      () => {
        setLoadError('Unable to access your current location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-blood-dark">{title}</p>
          <p className="text-sm text-medical-gray">{description}</p>
        </div>
        <button type="button" onClick={useCurrentLocation} className="btn-secondary" disabled={locating}>
          {locating ? 'Locating...' : 'Use current location'}
        </button>
      </div>

      {apiKey ? (
        <input
          ref={searchInputRef}
          type="text"
          className="input-field"
          placeholder="Search a place on Google Maps"
        />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env` to enable the interactive Google Map picker.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {apiKey ? (
          <div ref={mapContainerRef} style={{ height: '280px', width: '100%' }} />
        ) : (
          <div className="flex h-[280px] items-center justify-center px-6 text-center text-sm text-medical-gray">
            Map preview is disabled until the Google Maps API key is configured.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
        <p className="text-sm text-medical-gray">
          Selected coordinates: {coordinates[0]?.toFixed?.(6)}, {coordinates[1]?.toFixed?.(6)}
        </p>
        {loadingMap && <p className="text-sm text-medical-gray">Loading map...</p>}
      </div>

      {loadError && <p className="text-sm text-amber-700">{loadError}</p>}
    </div>
  );
}
