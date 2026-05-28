const getTimeSlotIdentifier = (hour) => {
    if (hour >= 6 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 16) return 'afternoon';
    return 'night';
};

let cache = {
    title: '',
    combos: [],
    timeSlotIdentifier: null,
    timestamp: 0
};

const getCache = (hour) => {
    const slot = getTimeSlotIdentifier(hour);
    // Return cache if it matches the current time slot
    if (cache.timeSlotIdentifier === slot && cache.combos.length > 0) {
        return { title: cache.title, combos: cache.combos };
    }
    return null;
};

const setCache = (hour, title, combos) => {
    cache = {
        title,
        combos,
        timeSlotIdentifier: getTimeSlotIdentifier(hour),
        timestamp: Date.now()
    };
};

const clearCache = () => {
    cache = {
        title: '',
        combos: [],
        timeSlotIdentifier: null,
        timestamp: 0
    };
};

module.exports = { getCache, setCache, getTimeSlotIdentifier, clearCache };
