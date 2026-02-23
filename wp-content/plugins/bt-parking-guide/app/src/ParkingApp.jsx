import React, { Suspense } from 'react';

const ParkingMap3D = React.lazy(() => import('./components/ParkingMap3D'));

export default function ParkingApp() {
  return (
    <div className="parking-app cwidth">
      <Suspense fallback={null}>
        <ParkingMap3D />
      </Suspense>
    </div>
  );
}
