import { useState, useEffect, useCallback } from 'react';
import SmsEngine, { SimCardInfo } from '../../modules/sms-engine';

export interface SimOption {
  label: string;
  value: number;
}

export function useSimCards() {
  const [isDualSim, setIsDualSim] = useState<boolean>(false);
  const [simCards, setSimCards] = useState<SimCardInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSimInfo = useCallback(async () => {
    try {
      const dual = await SmsEngine.isDualSim();
      let cards: SimCardInfo[] = [];
      try {
        cards = await SmsEngine.getAvailableSimSlots();
      } catch (e) {
        console.log('Error getting SIM cards:', e);
      }

      setIsDualSim(dual);
      setSimCards(cards);
    } catch (e) {
      console.log('Error checking dual SIM:', e);
      setIsDualSim(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimInfo();
  }, [fetchSimInfo]);

  // Format options for SegmentedControl
  const simOptions: SimOption[] = isDualSim && simCards.length > 1
    ? simCards.map((card, idx) => ({
        label: card.displayName || card.carrierName || `SIM ${idx + 1}`,
        value: card.slotIndex ?? idx,
      }))
    : [
        { label: 'SIM 1', value: 0 },
        { label: 'SIM 2', value: 1 },
      ];

  const singleSimLabel = simCards.length > 0
    ? (simCards[0].displayName || simCards[0].carrierName || 'SIM 1')
    : 'SIM 1';

  return {
    isDualSim,
    simCards,
    simOptions,
    singleSimLabel,
    loading,
    refreshSimCards: fetchSimInfo,
  };
}
