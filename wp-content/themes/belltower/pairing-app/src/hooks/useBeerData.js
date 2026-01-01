import { useBeerDataContext } from '../providers/BeerDataProvider';

export function useBeerData() {
  return useBeerDataContext();
}
