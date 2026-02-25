import React, { Suspense } from 'react';

const ParkingMap3D = React.lazy(() => import('./components/ParkingMap3D'));

export default function ParkingApp() {
  return (
    <div className="parking-app cwidth">
      <Suspense fallback={<p className="parking-app__label">Loading parking map...</p>}>
        <ParkingMap3D />
      </Suspense>
    </div>
  );
}
