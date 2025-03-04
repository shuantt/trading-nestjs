import moment from 'moment';

/**
 * 檢查給定的日期是否為週末（六、日）
 * @param dateStr - 日期字串，格式為 "YYYY-MM-DD"
 * @returns 如果是週末回傳 true，否則回傳 false
 */
export const isWeekend = (dateStr: string): boolean => {
  const date = moment(dateStr, 'YYYY-MM-DD');

  if (!date.isValid()) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD.');
  }

  const dayOfWeek = date.isoWeekday(); // 1（星期一）到 7（星期日）

  return dayOfWeek === 6 || dayOfWeek === 7;
};

/**
 * 格式化日期字串
 * @param dateStr - 日期字串，格式為 "YYYY-MM-DD"
 * @param format - 格式化字串，預設為 "YYYY-MM-DD"
 * @returns 格式化後的日期字串
 */
export const formatDate = (
  dateStr: string,
  format: string = 'YYYY-MM-DD'
): string => {
  const date = moment(dateStr, 'YYYY-MM-DD');
  if (!date.isValid()) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD.');
  }
  return date.format(format);
};