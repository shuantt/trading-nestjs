import dayjs from 'dayjs';
/**
 * 檢查給定的日期是否為週末（六、日）
 * @param dateStr - 日期字串，格式為 "YYYY-MM-DD"
 * @returns 如果是週末回傳 true，否則回傳 false
 */
export const isWeekend = (dateStr: string): boolean => {
  const dayOfWeek = dayjs(dateStr).day();
  return dayOfWeek === 0 || dayOfWeek === 6;
};
