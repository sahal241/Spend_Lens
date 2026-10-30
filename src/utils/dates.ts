export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const monthKey = (date = new Date()) => localDate(date).slice(0, 7);
export const moveMonth = (key: string, change: number) =>
  monthKey(
    new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + change, 1),
  );
export const monthLabel = (key: string, short = false) =>
  new Date(`${key}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: short ? "short" : "long",
    year: "numeric",
  });
export const dateLabel = (date: string) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date === localDate()
    ? "Today"
    : date === localDate(yesterday)
      ? "Yesterday"
      : new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
};
export function mondayKey(date: string) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDate(d);
}
