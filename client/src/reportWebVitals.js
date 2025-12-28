const reportWebVitals = (onPerfEntry, webVitals) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitals || require('web-vitals');
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    } catch (e) {
      return;
    }
  }
};

export default reportWebVitals;
