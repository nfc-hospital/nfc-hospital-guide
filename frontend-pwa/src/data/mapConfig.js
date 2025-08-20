export const MAP_CONFIG = {
  main: {
    '1': { overview: 'main_1f', detail: 'main_1f' },
    '2': { overview: 'overview_main_2f', detail: 'main_2f' },
  },
  cancer: {
    '1': { overview: 'cancer_1f', detail: 'cancer_1f' },
    '2': { overview: 'overview_cancer_2f', detail: 'cancer_2f' },
  },
  annex: {
    '1': { overview: 'annex_1f', detail: 'annex_1f' },
  },
};

export const getMapInfo = (building, floor) => {
  return MAP_CONFIG[building]?.[floor] || null;
};