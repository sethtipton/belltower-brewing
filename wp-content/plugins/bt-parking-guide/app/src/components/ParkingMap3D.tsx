import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Shape } from 'three';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Line, TransformControls } from '@react-three/drei';
import type { Line2, TransformControls as TransformControlsImpl } from 'three-stdlib';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import { createLogger } from '../logger';
import { fetchParkingMap, isAdminUser, saveParkingMap } from '../api';

type Vec3 = [number, number, number];
type Vec2 = [number, number];
type ActiveLot = 'east' | 'south' | 'north' | 'main' | 'street' | 'bridge1' | 'bridge2';

type LotMap = Record<ActiveLot, Vec2[]>;
type LabelMap = Record<ActiveLot, string>;

interface ParkingGuideCopy {
  title: string;
  intro: string;
  bikeParking: string;
  altTransportation: string;
  respectNotice: string;
}

interface ParkingMapPayload {
  lotOrder: ActiveLot[];
  lots: LotMap;
  labels: LabelMap;
  guide: ParkingGuideCopy;
  images: {
    background: string;
    guide: string;
  };
}

interface ParkingMapResponse {
  id?: number;
  map?: unknown;
}

const log = createLogger('parking');
const UNIT_SCALE: Vec3 = [1, 1, 1];
const CAMERA_POSITION: Vec3 = [0, 3.4, 5.4];
const LOT_KEYS: ActiveLot[] = ['east', 'south', 'north', 'main', 'street', 'bridge1', 'bridge2'];
const LOT_STROKE_COLOR = '#b8a881';
const LOT_STROKE_WIDTH = 1.5;
const LOT_INTRO_STAGGER_SECONDS = 0.2;
const LOT_INTRO_STROKE_DURATION_SECONDS = 0.25;
const LOT_INTRO_FILL_DELAY_SECONDS = 1;
const LOT_INTRO_FILL_DURATION_SECONDS = 1;
const LOT_INTRO_TOTAL_SECONDS =
  (LOT_KEYS.length - 1) * LOT_INTRO_STAGGER_SECONDS + LOT_INTRO_FILL_DELAY_SECONDS + LOT_INTRO_FILL_DURATION_SECONDS;
const LOT_PULSE_DELAY_SECONDS = 0.2;
const LOT_PULSE_PERIOD_SECONDS = 2.2;
const LOT_PULSE_AMPLITUDE = 0.2;
const GUIDE_COPY_FIELDS: { key: keyof ParkingGuideCopy; label: string; multiline?: boolean }[] = [
  { key: 'title', label: 'Guide title' },
  { key: 'intro', label: 'Intro', multiline: true },
  { key: 'bikeParking', label: 'Bike parking', multiline: true },
  { key: 'altTransportation', label: 'Alternative transportation', multiline: true },
  { key: 'respectNotice', label: 'Respect notice', multiline: true },
];

const FALLBACK_MAP: ParkingMapPayload = {
  lotOrder: ['north', 'east', 'south', 'main', 'street', 'bridge1', 'bridge2'],
  lots: {
    east: [[-0.405, -1.045], [0.185, -1.648], [0.612, -1.351], [-0.012, -0.794]],
    south: [[-0.309, -2.997], [0.348, -2.575], [0.101, -2.304], [-0.591, -2.760]],
    north: [[-3.865, 0.314], [-3.034, 0.823], [-4.986, 2.656], [-5.166, 2.522]],
    main: [[-1.882, -2.299], [-1.402, -1.958], [-1.73, -1.483], [-2.266, -1.639]],
    street: [[-4.553, 2.62], [-1.509, -0.167], [0.547, -2.229], [0.589, -2.174], [-1.483, -0.102], [-4.538, 2.688]],
    bridge1: [[1.258, -2.336], [2.397, -1.538], [2.364, -1.48], [1.23, -2.297]],
    bridge2: [[1.375, -2.526], [2.573, -1.668], [2.537, -1.621], [1.343, -2.482]],
  },
  labels: {
    east: 'East Lot:\nAcross the street from Bell Tower Brewing Co.\nFREE Nights (after 5PM) & Weekends.',
    south: 'South Lot:\nOne door down from Bell Tower Brewing Co.\nFREE Nights (after 5PM) & Weekends.\n311 W Main St., Kent, OH 44240',
    north: 'North Lot:\n500 ft North of our building.\nFREE 24/7.\n300 Gougler Ave., Kent, OH 44240',
    main: 'Main Lot:\nOur private 18-car parking lot with bike rack,\n310 Park Ave., Kent, OH 44240',
    street: 'Street Parking:\nFREE 24/7 street parking.',
    bridge1: 'Street Parking:\nFREE 24/7 street parking.',
    bridge2: 'Street Parking:\nFREE 24/7 street parking.',
  },
  guide: {
    title: 'Parking Guide',
    intro: 'Bell Tower Brewing Co. is located at 310 Park Ave., Kent, OH 44240. We have a private 18-car parking lot on-site as well as ample public parking surrounding our building. All highlighted yellow areas on the map are free, public parking available to our guests.',
    bikeParking: 'Bike Parking: We have two bike parking areas for your convenience. One is located at our main entrance, and the other is located on the Southeast corner of the building.',
    altTransportation: 'Alternative Transportation: The nearest major bus stop & station is the Kent Central Gateway, which is only a few minutes’ walk across the river.',
    respectNotice: 'Out of respect for our neighbors, please do not park on Park Ave.',
  },
  images: {
    background: '/wp-content/themes/belltower/images/parkingbackground.webp',
    guide: '/wp-content/themes/belltower/images/Parking-Map-Graphic-665x1024.png',
  },
};

const GUIDE_ORDER: ActiveLot[] = ['north', 'east', 'south', 'main', 'street'];

const cloneMap = (source: ParkingMapPayload): ParkingMapPayload => ({
  ...source,
  lotOrder: [...source.lotOrder],
  lots: LOT_KEYS.reduce((acc, key) => {
    acc[key] = (source.lots[key] ?? []).map((pt) => [Number(pt[0]), Number(pt[1])] as Vec2);
    return acc;
  }, {} as LotMap),
  labels: { ...source.labels },
  guide: { ...source.guide },
  images: { ...source.images },
});

const normalizePoints = (value: unknown, fallback: Vec2[]): Vec2[] => {
  if (!Array.isArray(value)) return fallback;
  const points = value
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return [x, y] as Vec2;
    })
    .filter((point): point is Vec2 => Boolean(point));
  return points.length ? points : fallback;
};

const normalizeMap = (map: unknown): ParkingMapPayload => {
  const source = (map && typeof map === 'object' ? map : {}) as Record<string, unknown>;
  const lotsSrc = (source.lots && typeof source.lots === 'object' ? source.lots : {}) as Record<string, unknown>;
  const labelsSrc = (source.labels && typeof source.labels === 'object' ? source.labels : {}) as Record<string, unknown>;
  const guideSrc = (source.guide && typeof source.guide === 'object' ? source.guide : {}) as Record<string, unknown>;
  const imagesSrc = (source.images && typeof source.images === 'object' ? source.images : {}) as Record<string, unknown>;

  const lots = LOT_KEYS.reduce((acc, key) => {
    acc[key] = normalizePoints(lotsSrc[key], FALLBACK_MAP.lots[key]);
    return acc;
  }, {} as LotMap);

  const labels = LOT_KEYS.reduce((acc, key) => {
    const raw = labelsSrc[key];
    acc[key] = typeof raw === 'string' && raw ? raw : FALLBACK_MAP.labels[key];
    return acc;
  }, {} as LabelMap);

  const lotOrderRaw = Array.isArray(source.lotOrder) ? source.lotOrder : FALLBACK_MAP.lotOrder;
  const lotOrder = lotOrderRaw
    .map((item): ActiveLot | null => {
      const key = String(item);
      return LOT_KEYS.includes(key as ActiveLot) ? (key as ActiveLot) : null;
    })
    .filter((item, index, arr): item is ActiveLot => item !== null && arr.indexOf(item) === index);
  LOT_KEYS.forEach((key) => {
    if (!lotOrder.includes(key)) lotOrder.push(key);
  });

  return {
    lotOrder,
    lots,
    labels,
    guide: {
      title: typeof guideSrc.title === 'string' && guideSrc.title ? guideSrc.title : FALLBACK_MAP.guide.title,
      intro: typeof guideSrc.intro === 'string' && guideSrc.intro ? guideSrc.intro : FALLBACK_MAP.guide.intro,
      bikeParking: typeof guideSrc.bikeParking === 'string' && guideSrc.bikeParking ? guideSrc.bikeParking : FALLBACK_MAP.guide.bikeParking,
      altTransportation:
        typeof guideSrc.altTransportation === 'string' && guideSrc.altTransportation
          ? guideSrc.altTransportation
          : FALLBACK_MAP.guide.altTransportation,
      respectNotice:
        typeof guideSrc.respectNotice === 'string' && guideSrc.respectNotice
          ? guideSrc.respectNotice
          : FALLBACK_MAP.guide.respectNotice,
    },
    images: {
      background:
        typeof imagesSrc.background === 'string' && imagesSrc.background
          ? imagesSrc.background
          : FALLBACK_MAP.images.background,
      guide:
        typeof imagesSrc.guide === 'string' && imagesSrc.guide
          ? imagesSrc.guide
          : FALLBACK_MAP.images.guide,
    },
  };
};

const readStorageFlag = (keys: string[]): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return keys.some((key) => {
      const raw = window.localStorage?.getItem(key);
      return raw === '1' || raw === 'true' || raw === 'yes';
    });
  } catch {
    return false;
  }
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);

function ParkingLot({
  setGroupRef,
  onHoverChange,
  onToggleSelect,
  lotOrderIndex,
  animateIntro,
  animatePulse,
  lotKey,
  lotPoints,
  editVertices,
  selectedVertex,
  onSelectVertex,
  vertexRefs,
  lotScale,
  isHovered,
  isSelected,
  debugColor,
}: {
  setGroupRef: React.RefCallback<Group>;
  onHoverChange: (lot: ActiveLot | null) => void;
  onToggleSelect: (lot: ActiveLot) => void;
  lotOrderIndex: number;
  animateIntro: boolean;
  animatePulse: boolean;
  lotKey: ActiveLot;
  lotPoints: Vec2[];
  editVertices: boolean;
  selectedVertex: number | null;
  onSelectVertex: (index: number | null) => void;
  vertexRefs: React.MutableRefObject<(Mesh | null)[]>;
  lotScale: Vec3;
  isHovered: boolean;
  isSelected: boolean;
  debugColor?: string;
}) {
  const lotShape = useMemo(() => {
    const shape = new Shape();
    if (lotPoints.length > 0) {
      shape.moveTo(lotPoints[0][0], lotPoints[0][1]);
      for (let i = 1; i < lotPoints.length; i += 1) {
        shape.lineTo(lotPoints[i][0], lotPoints[i][1]);
      }
      shape.closePath();
    }
    return shape;
  }, [lotPoints]);

  const lotStrokePoints = useMemo(() => {
    if (lotPoints.length < 2) return [] as [number, number, number][];
    const points = lotPoints.map(([x, y]) => [x, y, 0.015] as [number, number, number]);
    points.push([lotPoints[0][0], lotPoints[0][1], 0.015]);
    return points;
  }, [lotPoints]);
  const fillMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const strokeLineRef = useRef<Line2 | null>(null);
  const baseFillOpacity = isHovered || isSelected ? 0.9 : 0.8;
  const baseStrokeOpacity = isHovered || isSelected ? 1 : 0.8;
  const baseEmissive = isHovered || isSelected ? 1 : 0.6;

  useFrame((state) => {
    const fillMaterial = fillMaterialRef.current;
    if (!fillMaterial) return;

    let fillOpacity = baseFillOpacity;
    let strokeOpacity = baseStrokeOpacity;
    let emissiveIntensity = baseEmissive;

    if (animateIntro) {
      const elapsed = state.clock.elapsedTime;
      const lotStart = lotOrderIndex * LOT_INTRO_STAGGER_SECONDS;
      const strokeReveal = easeOutCubic((elapsed - lotStart) / LOT_INTRO_STROKE_DURATION_SECONDS);
      const fillStart = lotStart + LOT_INTRO_FILL_DELAY_SECONDS;
      const fillReveal = easeOutCubic((elapsed - fillStart) / LOT_INTRO_FILL_DURATION_SECONDS);

      fillOpacity = baseFillOpacity * fillReveal;
      strokeOpacity = baseStrokeOpacity * strokeReveal;
      emissiveIntensity = Math.max(0.2, baseEmissive * (0.35 + 0.65 * fillReveal));
    }

    if (animatePulse) {
      const elapsed = state.clock.elapsedTime;
      const pulseStart = LOT_INTRO_TOTAL_SECONDS + LOT_PULSE_DELAY_SECONDS;
      if (elapsed >= pulseStart) {
        const pulseWave = Math.sin(((elapsed - pulseStart) / LOT_PULSE_PERIOD_SECONDS) * Math.PI * 2);
        const pulse = pulseWave * LOT_PULSE_AMPLITUDE;
        fillOpacity *= 1 + pulse;
        strokeOpacity *= 1 + pulse * 0.85;
        emissiveIntensity *= 1 + pulse * 0.5;
      }
    }

    fillMaterial.opacity = clamp01(fillOpacity);
    fillMaterial.emissiveIntensity = Math.max(0, emissiveIntensity);

    const strokeMaterial = strokeLineRef.current?.material as { opacity?: number } | undefined;
    if (strokeMaterial && typeof strokeMaterial.opacity === 'number') {
      strokeMaterial.opacity = clamp01(strokeOpacity);
    }
  });

  return (
    <group ref={setGroupRef}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh
          onPointerOver={() => onHoverChange(lotKey)}
          onPointerOut={() => onHoverChange(null)}
          onPointerDown={(event) => {
            event.stopPropagation();
            onToggleSelect(lotKey);
          }}
        >
          <shapeGeometry args={[lotShape]} />
          <meshStandardMaterial
            ref={fillMaterialRef}
            color={debugColor ?? '#515441'}
            emissive="#0f0f0f"
            emissiveIntensity={animateIntro ? 0.2 : baseEmissive}
            transparent
            opacity={animateIntro ? 0 : baseFillOpacity}
          />
        </mesh>
        {lotStrokePoints.length > 1 ? (
          <Line
            ref={strokeLineRef}
            points={lotStrokePoints}
            color={LOT_STROKE_COLOR}
            lineWidth={LOT_STROKE_WIDTH}
            transparent
            opacity={animateIntro ? 0 : baseStrokeOpacity}
          />
        ) : null}
        {editVertices
          ? lotPoints.map((point, index) => (
              <mesh
                key={`${lotKey}-vertex-${index}`}
                ref={(node) => {
                  vertexRefs.current[index] = node;
                }}
                position={[point[0], point[1], 0.01]}
                scale={[
                  lotScale[0] !== 0 ? 0.2 / lotScale[0] : 0.2,
                  lotScale[1] !== 0 ? 0.2 / lotScale[1] : 0.2,
                  lotScale[2] !== 0 ? 0.2 / lotScale[2] : 0.2,
                ]}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelectVertex(index);
                }}
              >
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color={selectedVertex === index ? '#ffcc66' : '#f5f2e9'} />
              </mesh>
            ))
          : null}
      </group>
    </group>
  );
}

export default function ParkingMap3D(): React.ReactElement | null {
  const prefersReduced = Boolean(usePrefersReducedMotion());
  const [savedMap, setSavedMap] = useState<ParkingMapPayload>(cloneMap(FALLBACK_MAP));
  const [draftMap, setDraftMap] = useState<ParkingMapPayload>(cloneMap(FALLBACK_MAP));
  const [activeLot, setActiveLot] = useState<ActiveLot>('east');
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [hoveredLot, setHoveredLot] = useState<ActiveLot | null>(null);
  const [selectedLot, setSelectedLot] = useState<ActiveLot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editVertices, setEditVertices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const lotRefs = useRef<Record<ActiveLot, Group | null>>({
    east: null,
    south: null,
    north: null,
    main: null,
    street: null,
    bridge1: null,
    bridge2: null,
  });

  const vertexRefs = useRef<Record<ActiveLot, (Mesh | null)[]>>({
    east: [],
    south: [],
    north: [],
    main: [],
    street: [],
    bridge1: [],
    bridge2: [],
  });

  const vertexControlsRef = useRef<TransformControlsImpl | null>(null);
  const isAdmin = isAdminUser();
  const debugMode = readStorageFlag(['bt_parking_debug', 'bt_pairing_debug']);

  const [webglOk] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      return Boolean(ctx);
    } catch {
      return false;
    }
  });

  const [simulateNoWebgl, setSimulateNoWebgl] = useState(() => readStorageFlag(['bt_parking_simulate_webgl_off', 'bt_pairing_simulate_webgl_off']));
  const webglActive = webglOk && !simulateNoWebgl;
  const [showGuide, setShowGuide] = useState(() => !webglOk);
  const [introUiReady, setIntroUiReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const lastLabelRef = useRef('');

  const mapData = isEditing ? draftMap : savedMap;
  const shouldAnimateIntro = webglActive && !prefersReduced;
  const shouldPulseLots = shouldAnimateIntro && !hasUserInteracted;

  useEffect(() => {
    if (!shouldAnimateIntro) {
      setIntroUiReady(true);
      return;
    }
    setIntroUiReady(false);
    const timeout = window.setTimeout(() => {
      setIntroUiReady(true);
    }, Math.round(LOT_INTRO_TOTAL_SECONDS * 1000));
    return () => {
      window.clearTimeout(timeout);
    };
  }, [shouldAnimateIntro]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = (await fetchParkingMap()) as ParkingMapResponse;
        const normalized = normalizeMap(response?.map);
        if (!cancelled) {
          setSavedMap(cloneMap(normalized));
          setDraftMap(cloneMap(normalized));
          setActiveLot((prev) => (normalized.lotOrder.includes(prev) ? prev : normalized.lotOrder[0] ?? 'east'));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load map data.');
          setSavedMap(cloneMap(FALLBACK_MAP));
          setDraftMap(cloneMap(FALLBACK_MAP));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // eslint-disable-next-line react-you-might-not-need-an-effect/no-initialize-state
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const guideId = 'bt-parking-guide-details';

  const activeLotPoints = mapData.lots[activeLot] ?? [];
  const activeVertexObject = selectedVertex === null ? null : vertexRefs.current[activeLot][selectedVertex] ?? null;
  const activeInfoLot = hoveredLot ?? selectedLot;
  const hoveredLabel = activeInfoLot ? mapData.labels[activeInfoLot] : null;
  if (hoveredLabel) {
    lastLabelRef.current = hoveredLabel;
  }
  const labelForDisplay = hoveredLabel ?? lastLabelRef.current;

  const formatVec2 = (value: Vec2) => `[${value.map((item) => item.toFixed(3)).join(', ')}]`;
  const activeLotPointsText = useMemo(() => activeLotPoints.map(formatVec2).join(', '), [activeLotPoints]);

  const setLotRef = useCallback(
    (lot: ActiveLot) => (node: Group | null) => {
      lotRefs.current[lot] = node;
    },
    []
  );

  const handleVertexMove = useCallback((lot: ActiveLot, index: number, position: Vec3) => {
    setDraftMap((current) => {
      const next = cloneMap(current);
      const points = [...next.lots[lot]];
      if (!points[index]) return current;
      points[index] = [position[0], position[1]];
      next.lots[lot] = points;
      return next;
    });
  }, []);

  const toggleLotSelection = useCallback((lot: ActiveLot) => {
    setHasUserInteracted((prev) => (prev ? prev : true));
    setSelectedLot((current) => (current === lot ? null : lot));
  }, []);

  const handleLotHoverChange = useCallback((lot: ActiveLot | null) => {
    if (lot) {
      setHasUserInteracted((prev) => (prev ? prev : true));
    }
    setHoveredLot(lot);
  }, []);

  const updateLabelCopy = useCallback((lot: ActiveLot, value: string) => {
    setDraftMap((current) => {
      const next = cloneMap(current);
      next.labels[lot] = value;
      return next;
    });
  }, []);

  const updateGuideCopy = useCallback((field: keyof ParkingGuideCopy, value: string) => {
    setDraftMap((current) => {
      const next = cloneMap(current);
      next.guide[field] = value;
      return next;
    });
  }, []);

  const beginEditing = () => {
    setDraftMap(cloneMap(savedMap));
    setIsEditing(true);
    setEditVertices(false);
    setSelectedVertex(null);
  };

  const cancelEditing = () => {
    setDraftMap(cloneMap(savedMap));
    setIsEditing(false);
    setEditVertices(false);
    setSelectedVertex(null);
  };

  const saveEditing = async () => {
    if (!isAdmin || !isEditing) return;
    setIsSaving(true);
    try {
      const response = (await saveParkingMap(draftMap)) as ParkingMapResponse;
      const normalized = normalizeMap(response?.map);
      setSavedMap(cloneMap(normalized));
      setDraftMap(cloneMap(normalized));
      setIsEditing(false);
      setEditVertices(false);
      setSelectedVertex(null);
      setLoadError('');
      log.info('save.success', { phase: 'parking' });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to save map.');
      log.error('save.error', { phase: 'parking', error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSimulatedWebgl = () => {
    setSimulateNoWebgl((prev) => {
      const next = !prev;
      try {
        window.localStorage?.setItem('bt_pairing_simulate_webgl_off', next ? '1' : '0');
        window.localStorage?.setItem('bt_parking_simulate_webgl_off', next ? '1' : '0');
      } catch {
        // ignore local storage failures
      }
      return next;
    });
  };

  const adminControls = isAdmin ? (
    <div className="parking3d__controls" role="group" aria-label="Parking map controls">
      {!isEditing ? (
        <button type="button" onClick={beginEditing} disabled={isLoading}>Edit map</button>
      ) : (
        <>
          <button
            type="button"
            className={editVertices ? 'is-active' : ''}
            onClick={() => {
              setEditVertices((prev) => !prev);
              setSelectedVertex(null);
            }}
          >
            {editVertices ? 'Editing vertices' : 'Edit vertices'}
          </button>
          {LOT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={activeLot === key ? 'is-active' : ''}
              onClick={() => {
                setActiveLot(key);
                setSelectedVertex(null);
              }}
            >
              {`Edit ${key.charAt(0).toUpperCase()}${key.slice(1)}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              void saveEditing();
            }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save map'}
          </button>
          <button type="button" onClick={cancelEditing} disabled={isSaving}>Cancel</button>
          <div className="parking3d__readout">
            <code>lot points: {activeLotPointsText}</code>
          </div>
          <div className="parking3d__copy-editor">
            <h4>Lot Labels</h4>
            <div className="parking3d__copy-grid">
              {LOT_KEYS.map((lotKey) => {
                const fieldId = `parking-label-${lotKey}`;
                return (
                  <label key={`label-copy-${lotKey}`} className="parking3d__copy-field" htmlFor={fieldId}>
                    <span>{`${lotKey.charAt(0).toUpperCase()}${lotKey.slice(1)} label`}</span>
                    <textarea
                      id={fieldId}
                      name={fieldId}
                      value={draftMap.labels[lotKey]}
                      rows={3}
                      onChange={(event) => updateLabelCopy(lotKey, event.target.value)}
                      disabled={isSaving}
                    />
                  </label>
                );
              })}
            </div>
            <h4>Guide Copy</h4>
            <div className="parking3d__copy-grid parking3d__copy-grid--guide">
              {GUIDE_COPY_FIELDS.map((field) => {
                const fieldId = `parking-guide-${field.key}`;
                return (
                  <label key={`guide-copy-${field.key}`} className="parking3d__copy-field" htmlFor={fieldId}>
                    <span>{field.label}</span>
                    {field.multiline ? (
                      <textarea
                        id={fieldId}
                        name={fieldId}
                        value={draftMap.guide[field.key]}
                        rows={3}
                        onChange={(event) => updateGuideCopy(field.key, event.target.value)}
                        disabled={isSaving}
                      />
                    ) : (
                      <input
                        id={fieldId}
                        name={fieldId}
                        type="text"
                        value={draftMap.guide[field.key]}
                        onChange={(event) => updateGuideCopy(field.key, event.target.value)}
                        disabled={isSaving}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      {debugMode ? (
        <button
          type="button"
          className={simulateNoWebgl ? 'is-active webgl' : 'webgl'}
          onClick={toggleSimulatedWebgl}
        >
          {simulateNoWebgl ? 'Simulated WebGL Off' : 'Simulate WebGL Off'}
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="parking3d-wrap">
      <div className="parking3d">
        <div className={`parking3d__guide-toggle${shouldAnimateIntro && !introUiReady ? ' is-intro-hidden' : ''}`}>
          {webglActive && !showGuide ? (
            <p className="descTxt">Available parking is highlighted in green. Hover or tap on a lot for more info.</p>
          ) : null}
          <button
            type="button"
            aria-expanded={showGuide}
            aria-controls={guideId}
            onClick={() => {
              setHasUserInteracted((prev) => (prev ? prev : true));
              setShowGuide((prev) => !prev);
            }}
          >
            {showGuide ? 'Close Parking Guide' : 'Open Parking Guide'}
          </button>
        </div>

        <img src={mapData.images.background} alt="" className="parking3d__image" loading="lazy" />

        <div id={guideId} className={`parking3d__guide ${showGuide ? 'is-visible' : ''}`}>
          <div className="leftclm">
            <h3>{mapData.guide.title}</h3>
            <p>{mapData.guide.intro}</p>
            <ul>
              {GUIDE_ORDER.map((lotKey) => (
                <li key={lotKey}>
                  {mapData.labels[lotKey].split('\n').map((line, index) => (
                    <span key={`${lotKey}-${line}-${index}`}>{line}</span>
                  ))}
                </li>
              ))}
            </ul>
            <p>{mapData.guide.bikeParking}</p>
            <p>{mapData.guide.altTransportation}</p>
            <p>{mapData.guide.respectNotice}</p>
            {loadError ? <p>{loadError}</p> : null}
          </div>
          <div className="rightclm">
            <img src={mapData.images.guide} alt="" className="parking3d__image" loading="lazy" />
          </div>
        </div>

        {!webglActive ? null : (
          <Canvas
            frameloop={prefersReduced ? 'never' : 'always'}
            camera={{ position: CAMERA_POSITION, fov: 45 }}
            dpr={[1, 1.5]}
            onPointerMissed={() => {
              setHasUserInteracted((prev) => (prev ? prev : true));
              setSelectedLot(null);
              setHoveredLot(null);
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[4, 5, 3]} intensity={0.9} />

            {isEditing && editVertices && selectedVertex !== null ? (
              <TransformControls
                ref={vertexControlsRef}
                mode="translate"
                object={activeVertexObject ?? undefined}
                showZ={false}
                space="local"
                onObjectChange={() => {
                  if (!activeVertexObject) return;
                  handleVertexMove(activeLot, selectedVertex, [
                    activeVertexObject.position.x,
                    activeVertexObject.position.y,
                    activeVertexObject.position.z,
                  ]);
                }}
              />
            ) : null}

            {mapData.lotOrder.map((lotKey, lotIndex) => (
              <ParkingLot
                key={lotKey}
                setGroupRef={setLotRef(lotKey)}
                onHoverChange={handleLotHoverChange}
                onToggleSelect={toggleLotSelection}
                lotOrderIndex={lotIndex}
                animateIntro={shouldAnimateIntro}
                animatePulse={shouldPulseLots}
                lotKey={lotKey}
                lotPoints={mapData.lots[lotKey]}
                editVertices={isEditing && editVertices && activeLot === lotKey}
                selectedVertex={activeLot === lotKey ? selectedVertex : null}
                onSelectVertex={activeLot === lotKey ? setSelectedVertex : () => null}
                vertexRefs={{ current: vertexRefs.current[lotKey] }}
                lotScale={UNIT_SCALE}
                isHovered={hoveredLot === lotKey}
                isSelected={selectedLot === lotKey}
                debugColor={isEditing && activeLot === lotKey ? '#ff4fa3' : undefined}
              />
            ))}
          </Canvas>
        )}

        <div className={`parking3d__label ${hoveredLabel ? 'is-visible' : ''}`}>
          {labelForDisplay
            ? labelForDisplay.split('\n').map((line, index) => <span key={`${line}-${index}`}>{line}</span>)
            : null}
        </div>
      </div>
      {adminControls}
    </div>
  );
}
