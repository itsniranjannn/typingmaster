export const buildSmoothPath = (points, valueKey) => {
  if (!Array.isArray(points) || points.length === 0) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point[valueKey]}`;
  }

  const path = [`M ${points[0].x} ${points[0][valueKey]}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] || current;
    const following = points[index + 2] || next;

    const controlPoint1X = current.x + (next.x - previous.x) / 6;
    const controlPoint1Y = current[valueKey] + (next[valueKey] - previous[valueKey]) / 6;
    const controlPoint2X = next.x - (following.x - current.x) / 6;
    const controlPoint2Y = next[valueKey] - (following[valueKey] - current[valueKey]) / 6;

    path.push(`C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next[valueKey]}`);
  }

  return path.join(" ");
};
