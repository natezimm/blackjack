export const __invokeWebVitals = async (onPerfEntry, webVitalsModule) => {
  try {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } =
      webVitalsModule || (await import('web-vitals'));
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  } catch (e) {
    return;
  }
};

const reportWebVitals = (onPerfEntry, webVitalsModule) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    return __invokeWebVitals(onPerfEntry, webVitalsModule);
  }
  return Promise.resolve();
};

export default reportWebVitals;
