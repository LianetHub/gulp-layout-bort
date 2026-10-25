export function savePickup(points, point, replacingId) {
    return [...points.filter(item => item.id !== replacingId && item.id !== point.id).map(item => ({ ...item, selected: false })), { ...point, selected: true }];
}
export function removePickup(points, id) {
    const result = points.filter(point => point.id !== id).map(point => ({ ...point }));
    if (result.length && !result.some(point => point.selected)) result[0].selected = true;
    return result;
}
export function filterPickups(points, query) {
    const normalized = query.trim().toLocaleLowerCase('ru');
    return points.filter(point => (point.title + ' ' + point.address).toLocaleLowerCase('ru').includes(normalized));
}

