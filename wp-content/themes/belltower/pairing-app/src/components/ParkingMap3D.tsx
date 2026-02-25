import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Shape } from 'three';
import type { Group, Mesh } from 'three';
import { TransformControls } from '@react-three/drei';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';


type Vec3 = [number, number, number];
type Vec2 = [number, number];
type ActiveLot = 'east' | 'south' | 'north' | 'main' | 'street' | 'bridge1' | 'bridge2';
const UNIT_SCALE: Vec3 = [1, 1, 1];
const CAMERA_POSITION: Vec3 = [0, 3.4, 5.4];

function ParkingLot({
  setGroupRef,
  onHoverChange,
  lotKey,
  lotPoints,
  editVertices,
  selectedVertex,
  onSelectVertex,
  vertexRefs,
  lotScale,
  isHovered,
  debugColor,
}: {
  setGroupRef: React.RefCallback<Group>;
  onHoverChange: (lot: ActiveLot | null) => void;
  lotKey: ActiveLot;
  label: string;
  lotPoints: Vec2[];
  editVertices: boolean;
  selectedVertex: number | null;
  onSelectVertex: (index: number | null) => void;
  vertexRefs: React.MutableRefObject<(Mesh | null)[]>;
  lotScale: Vec3;
  isHovered: boolean;
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

  const content = (
    <>
      <group
        ref={setGroupRef}
      >
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <mesh
            onPointerOver={() => onHoverChange(lotKey)}
            onPointerOut={() => onHoverChange(null)}
          >
            <shapeGeometry args={[lotShape]} />
            <meshStandardMaterial
              color={debugColor ?? '#515441'}
              emissive="#0f0f0f"
              emissiveIntensity={isHovered ? 1 : 0.6}
              transparent
              opacity={isHovered ? 0.9 : 0.8}
            />
          </mesh>
          {editVertices
            ? lotPoints.map((point, index) => (
              <mesh
                key={`lot-vertex-${index}`}
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
    </>
  );

  return content;
}
export default function ParkingMap3D(): React.ReactElement | null {
  const prefersReduced = Boolean(usePrefersReducedMotion());
  const lotLabels = useMemo(() => ({
    east: "East Lot:\nAcross the street from Bell Tower Brewing Co.\nFREE Nights (after 5PM) & Weekends.",
    south: "South Lot:\nOne door down from Bell Tower Brewing Co.\nFREE Nights (after 5PM) & Weekends.\n311 W Main St., Kent, OH 44240",
    north: "North Lot:\n500 ft North of our building.\nFREE 24/7.\n300 Gougler Ave., Kent, OH 44240",
    main: "Main Lot:\nOur private 18-car parking lot with bike rack.\n310 Park Ave., Kent, OH 44240",
    street: "Street Parking:\nFREE 24/7 street parking.",
    bridge1: "Street Parking:\nFREE 24/7 street parking.",
    bridge2: "Street Parking:\nFREE 24/7 street parking.",
  }), []);
  const showControls = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const win = window as {
      PAIRING_APP?: { debug?: boolean };
      PAIRINGAPP?: { debug?: boolean };
      localStorage?: Storage;
    };
    const hasAdminBar = document.body?.classList?.contains('admin-bar');
    const isLoggedIn = document.body?.classList?.contains('logged-in');
    if (!hasAdminBar || !isLoggedIn) return false;
    const explicit = win.PAIRING_APP?.debug ?? win.PAIRINGAPP?.debug;
    if (typeof explicit === 'boolean') return explicit;
    try {
      const raw = win.localStorage?.getItem('bt_pairing_debug');
      return raw === '1' || raw === 'true' || raw === 'yes';
    } catch {
      return false;
    }
  }, []);
  const [editVertices, setEditVertices] = useState(false);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [activeLot, setActiveLot] = useState<ActiveLot>('east');

  const [eastLotPoints, setEastLotPoints] = useState<Vec2[]>([[-0.405, -1.045], [0.185, -1.648], [0.612, -1.351], [-0.012, -0.794]]);
  const [southLotPoints, setSouthLotPoints] = useState<Vec2[]>([[-0.309, -2.997], [0.348, -2.575], [0.101, -2.304], [-0.591, -2.760]]);
  const [northLotPoints, setNorthLotPoints] = useState<Vec2[]>([[-3.865, 0.314], [-3.034, 0.823], [-4.986, 2.656], [-5.166, 2.522]]);
  const [mainLotPoints, setMainLotPoints] = useState<Vec2[]>([[-1.882, -2.299], [-1.402, -1.958], [-1.730, -1.483], [-2.266, -1.639]]);
  const [streetLotPoints, setStreetLotPoints] = useState<Vec2[]>([[-4.553, 2.620], [-1.509, -0.167], [0.547, -2.229], [0.589, -2.174], [-1.483, -0.102], [-4.538, 2.688]]);
  const [bridge1LotPoints, setBridge1LotPoints] = useState<Vec2[]>([[1.258, -2.336], [2.397, -1.538], [2.364, -1.480], [1.230, -2.297]]);
  const [bridge2LotPoints, setBridge2LotPoints] = useState<Vec2[]>([[1.375, -2.526], [2.573, -1.668], [2.537, -1.621], [1.343, -2.482]]);

  const lotRef = useRef<Group | null>(null);
  const southLotRef = useRef<Group | null>(null);
  const northLotRef = useRef<Group | null>(null);
  const mainLotRef = useRef<Group | null>(null);
  const streetLotRef = useRef<Group | null>(null);
  const bridge1LotRef = useRef<Group | null>(null);
  const bridge2LotRef = useRef<Group | null>(null);
  const vertexControlsRef = useRef<TransformControlsImpl | null>(null);
  const vertexRefs = useRef<(Mesh | null)[]>([]);
  const southVertexRefs = useRef<(Mesh | null)[]>([]);
  const northVertexRefs = useRef<(Mesh | null)[]>([]);
  const mainVertexRefs = useRef<(Mesh | null)[]>([]);
  const streetVertexRefs = useRef<(Mesh | null)[]>([]);
  const bridge1VertexRefs = useRef<(Mesh | null)[]>([]);
  const bridge2VertexRefs = useRef<(Mesh | null)[]>([]);
  const [, setLotObject] = useState<Group | null>(null);
  const [hoveredLot, setHoveredLot] = useState<ActiveLot | null>(null);
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
  const [simulateNoWebgl, setSimulateNoWebgl] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage?.getItem('bt_pairing_simulate_webgl_off') === '1';
    } catch {
      return false;
    }
  });
  const webglActive = webglOk && !simulateNoWebgl;
  const [showGuide, setShowGuide] = useState(() => !webglOk);
  const guideId = 'parking-guide';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const enabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled);
      setSimulateNoWebgl(enabled);
    };
    window.addEventListener('bt_pairing_simulate_webgl', handler);
    return () => window.removeEventListener('bt_pairing_simulate_webgl', handler);
  }, []);
  const formatVec2 = (value: Vec2) => `[${value.map((item) => item.toFixed(3)).join(', ')}]`;
  const activeLotPoints = useMemo(() => (
    activeLot === 'south'
      ? southLotPoints
      : activeLot === 'north'
        ? northLotPoints
        : activeLot === 'main'
          ? mainLotPoints
          : activeLot === 'street'
            ? streetLotPoints
            : activeLot === 'bridge1'
              ? bridge1LotPoints
              : activeLot === 'bridge2'
                ? bridge2LotPoints
                : eastLotPoints
  ), [activeLot, southLotPoints, northLotPoints, mainLotPoints, streetLotPoints, bridge1LotPoints, bridge2LotPoints, eastLotPoints]);
  const activeLotPointsText = useMemo(
    () => `${activeLotPoints.map(formatVec2).join(', ')}`,
    [activeLotPoints]
  );

  const handleVertexMove = (lot: ActiveLot, index: number, position: Vec3) => {
    if (lot === 'south') {
      setSouthLotPoints((current) => {
        const next = [...current];
        if (!next[index]) return current;
        next[index] = [position[0], position[1]];
        return next;
      });
      return;
    }
    if (lot === 'north') {
      setNorthLotPoints((current) => {
        const next = [...current];
        if (!next[index]) return current;
        next[index] = [position[0], position[1]];
        return next;
      });
      return;
    }
    if (lot === 'main') {
      setMainLotPoints((current) => {
        const next = [...current];
        if (!next[index]) return current;
        next[index] = [position[0], position[1]];
        return next;
      });
      return;
    }
    if (lot === 'street') {
      setStreetLotPoints((current) => {
        const next = [...current];
        if (!next[index]) return current;
        next[index] = [position[0], position[1]];
        return next;
      });
      return;
    }
    if (lot === 'bridge1') {
      setBridge1LotPoints((current) => {
        const next = [...current];
        if (!next[index]) return current;
        next[index] = [position[0], position[1]];
        return next;
      });
      return;
    }
    if (lot === 'bridge2') {
      setBridge2LotPoints((current) => {
        const next = [...current];
        if (!next[index]) return current;
        next[index] = [position[0], position[1]];
        return next;
      });
      return;
    }
    setEastLotPoints((current) => {
      const next = [...current];
      if (!next[index]) return current;
      next[index] = [position[0], position[1]];
      return next;
    });
  };


  const setLotNode = useCallback((node: Group | null) => {
    if (!node) return;
    lotRef.current = node;
    setLotObject(node);
  }, []);

  const setSouthLotNode = useCallback((node: Group | null) => {
    if (!node) return;
    southLotRef.current = node;
  }, []);

  const setNorthLotNode = useCallback((node: Group | null) => {
    if (!node) return;
    northLotRef.current = node;
  }, []);

  const setMainLotNode = useCallback((node: Group | null) => {
    if (!node) return;
    mainLotRef.current = node;
  }, []);

  const setStreetLotNode = useCallback((node: Group | null) => {
    if (!node) return;
    streetLotRef.current = node;
  }, []);

  const setBridge1LotNode = useCallback((node: Group | null) => {
    if (!node) return;
    bridge1LotRef.current = node;
  }, []);

  const setBridge2LotNode = useCallback((node: Group | null) => {
    if (!node) return;
    bridge2LotRef.current = node;
  }, []);
  const handleHoverChange = useCallback((lot: ActiveLot | null) => {
    setHoveredLot(lot);
  }, []);
  const activeVertexRefs = useMemo(() => ({
    east: vertexRefs,
    south: southVertexRefs,
    north: northVertexRefs,
    main: mainVertexRefs,
    street: streetVertexRefs,
    bridge1: bridge1VertexRefs,
    bridge2: bridge2VertexRefs,
  }), []);
  const activeVertexObject = useMemo(() => {
    if (!editVertices || selectedVertex === null) return null;
    const ref = activeVertexRefs[activeLot]?.current[selectedVertex];
    return ref ?? null;
  }, [activeLot, activeVertexRefs, editVertices, selectedVertex]);
  const hoveredLabel = hoveredLot ? lotLabels[hoveredLot] : null;

  return (
    <div className="parking3d">
      {showControls ? (
        <div className="parking3d__controls" role="group" aria-label="Parking 3D controls">
          <button type="button" className={editVertices ? 'is-active' : ''} onClick={() => { setEditVertices((prev) => !prev); setSelectedVertex(null); }}>Edit Shape</button>
          <button type="button" className={activeLot === 'east' ? 'is-active' : ''} onClick={() => { setActiveLot('east'); setSelectedVertex(null); }}>Edit East</button>
          <button type="button" className={activeLot === 'south' ? 'is-active' : ''} onClick={() => { setActiveLot('south'); setSelectedVertex(null); }}>Edit South</button>
          <button type="button" className={activeLot === 'north' ? 'is-active' : ''} onClick={() => { setActiveLot('north'); setSelectedVertex(null); }}>Edit North</button>
          <button type="button" className={activeLot === 'main' ? 'is-active' : ''} onClick={() => { setActiveLot('main'); setSelectedVertex(null); }}>Edit Main</button>
          <button type="button" className={activeLot === 'street' ? 'is-active' : ''} onClick={() => { setActiveLot('street'); setSelectedVertex(null); }}>Edit Street</button>
          <button type="button" className={activeLot === 'bridge1' ? 'is-active' : ''} onClick={() => { setActiveLot('bridge1'); setSelectedVertex(null); }}>Edit Bridge 1</button>
          <button type="button" className={activeLot === 'bridge2' ? 'is-active' : ''} onClick={() => { setActiveLot('bridge2'); setSelectedVertex(null); }}>Edit Bridge 2</button>
          <div className="parking3d__readout">
            <code>
              lot points: {activeLotPointsText}
            </code>
          </div>
          <button
            type="button"
            className={simulateNoWebgl ? 'is-active webgl' : 'webgl'}
            onClick={() => {
              setSimulateNoWebgl((prev) => {
                const next = !prev;
                try {
                  window.localStorage?.setItem('bt_pairing_simulate_webgl_off', next ? '1' : '0');
                } catch {
                  // Ignore localStorage failures.
                }
                try {
                  window.dispatchEvent(new CustomEvent('bt_pairing_simulate_webgl', { detail: { enabled: next } }));
                } catch {
                  // Ignore event dispatch failures.
                }
                return next;
              });
            }}
          >
            {simulateNoWebgl ? 'Simulated WebGL Off' : 'Simulate WebGL Off'}
          </button>
        </div>
      ) : null}
      <div className="parking3d__guide-toggle">
        {webglActive && !showGuide ? (
          <p className="descTxt">Available parking is highlighted in green. Hover or tap on a lot for more info.</p>
        ) : null}
        <button
          type="button"
          aria-expanded={showGuide}
          aria-controls={guideId}
          onClick={() => setShowGuide((prev) => !prev)}
        >
          {showGuide ? 'Close Parking Guide' : 'Open Parking Guide'}
        </button>
      </div>
      <img
        src="/wp-content/themes/belltower/images/parkingbackground.webp"
        alt=""
        className="parking3d__image"
        loading="lazy"
      />
      <div id={guideId} className={`parking3d__guide ${showGuide ? 'is-visible' : ''}`}>
        <div className="leftclm">
        <h3>Parking Guide</h3>
        <p>Bell Tower Brewing Co. is located at 310 Park Ave., Kent, OH 44240. We have a private 18-car parking lot on-site as well as ample public parking surrounding our building. All highlighted yellow areas on the map are free, public parking available to our guests.</p>
        <ul>
          {[lotLabels.north, lotLabels.east, lotLabels.south, lotLabels.main, lotLabels.street].map((label) => (
            <li key={label}>
              {label.split('\n').map((line, index) => (
                <span key={`${line}-${index}`}>{line}</span>
              ))}
            </li>
          ))}
        </ul>
        <p>Bike Parking: We have two bike parking areas for your convenience. One is located at our main entrance, and the other is located on the Southeast corner of the building.</p>
        <p>Alternative Transportation: The nearest major bus stop &amp; station is the Kent Central Gateway, which is only a few minutes’ walk across the river.</p>
        <p>Out of respect for our neighbors, please do not park on Park Ave.</p>
        </div>
        <div className="rightclm">
          <img
            src="/wp-content/themes/belltower/images/Parking-Map-Graphic-665x1024.png"
            alt=""
            className="parking3d__image"
            loading="lazy"
          />
        </div>
      </div>
      {!webglActive ? null : (
        <Canvas
          frameloop={prefersReduced ? 'never' : 'always'}
          camera={{ position: CAMERA_POSITION, fov: 45 }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 5, 3]} intensity={0.9} />
          {showControls && editVertices && selectedVertex !== null ? (
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
          <ParkingLot
            setGroupRef={setLotNode}
            onHoverChange={handleHoverChange}
            lotKey="east"
            label={lotLabels.east}
            lotPoints={eastLotPoints}
            editVertices={editVertices && activeLot === 'east'}
            selectedVertex={activeLot === 'east' ? selectedVertex : null}
            onSelectVertex={activeLot === 'east' ? setSelectedVertex : () => null}
            vertexRefs={vertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'east'}
            debugColor={editVertices && activeLot === 'east' ? '#ff4fa3' : undefined}
          />
          <ParkingLot
            setGroupRef={setSouthLotNode}
            onHoverChange={handleHoverChange}
            lotKey="south"
            label={lotLabels.south}
            lotPoints={southLotPoints}
            editVertices={editVertices && activeLot === 'south'}
            selectedVertex={activeLot === 'south' ? selectedVertex : null}
            onSelectVertex={activeLot === 'south' ? setSelectedVertex : () => null}
            vertexRefs={southVertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'south'}
            debugColor={editVertices && activeLot === 'south' ? '#ff4fa3' : undefined}
          />
          <ParkingLot
            setGroupRef={setNorthLotNode}
            onHoverChange={handleHoverChange}
            lotKey="north"
            label={lotLabels.north}
            lotPoints={northLotPoints}
            editVertices={editVertices && activeLot === 'north'}
            selectedVertex={activeLot === 'north' ? selectedVertex : null}
            onSelectVertex={activeLot === 'north' ? setSelectedVertex : () => null}
            vertexRefs={northVertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'north'}
            debugColor={editVertices && activeLot === 'north' ? '#ff4fa3' : undefined}
          />
          <ParkingLot
            setGroupRef={setMainLotNode}
            onHoverChange={handleHoverChange}
            lotKey="main"
            label={lotLabels.main}
            lotPoints={mainLotPoints}
            editVertices={editVertices && activeLot === 'main'}
            selectedVertex={activeLot === 'main' ? selectedVertex : null}
            onSelectVertex={activeLot === 'main' ? setSelectedVertex : () => null}
            vertexRefs={mainVertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'main'}
            debugColor={editVertices && activeLot === 'main' ? '#ff4fa3' : undefined}
          />
          <ParkingLot
            setGroupRef={setStreetLotNode}
            onHoverChange={handleHoverChange}
            lotKey="street"
            label={lotLabels.street}
            lotPoints={streetLotPoints}
            editVertices={editVertices && activeLot === 'street'}
            selectedVertex={activeLot === 'street' ? selectedVertex : null}
            onSelectVertex={activeLot === 'street' ? setSelectedVertex : () => null}
            vertexRefs={streetVertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'street'}
            debugColor={editVertices && activeLot === 'street' ? '#ff4fa3' : undefined}
          />
          <ParkingLot
            setGroupRef={setBridge1LotNode}
            onHoverChange={handleHoverChange}
            lotKey="bridge1"
            label={lotLabels.bridge1}
            lotPoints={bridge1LotPoints}
            editVertices={editVertices && activeLot === 'bridge1'}
            selectedVertex={activeLot === 'bridge1' ? selectedVertex : null}
            onSelectVertex={activeLot === 'bridge1' ? setSelectedVertex : () => null}
            vertexRefs={bridge1VertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'bridge1'}
            debugColor={editVertices && activeLot === 'bridge1' ? '#ff4fa3' : undefined}
          />
          <ParkingLot
            setGroupRef={setBridge2LotNode}
            onHoverChange={handleHoverChange}
            lotKey="bridge2"
            label={lotLabels.bridge2}
            lotPoints={bridge2LotPoints}
            editVertices={editVertices && activeLot === 'bridge2'}
            selectedVertex={activeLot === 'bridge2' ? selectedVertex : null}
            onSelectVertex={activeLot === 'bridge2' ? setSelectedVertex : () => null}
            vertexRefs={bridge2VertexRefs}
            lotScale={UNIT_SCALE}
            isHovered={hoveredLot === 'bridge2'}
            debugColor={editVertices && activeLot === 'bridge2' ? '#ff4fa3' : undefined}
          />
        </Canvas>
      )}
      <div className={`parking3d__label ${hoveredLabel ? 'is-visible' : ''}`}>
        {hoveredLabel
          ? hoveredLabel.split('\n').map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))
          : null}
      </div>
    </div>
  );
}
