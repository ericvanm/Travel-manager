export const splitDateTime = (dateTime?: string) => {
  if (!dateTime) {
    return { date: '', time: '' }
  }

  const separator = dateTime.includes('T') ? 'T' : ' '
  const [date, time = ''] = dateTime.split(separator)
  return { date, time }
}

export const getDatePart = (dateTime?: string) => splitDateTime(dateTime).date

export const getTimePart = (dateTime?: string, defaultTime = '09:00') => {
  const { time } = splitDateTime(dateTime)
  return time || defaultTime
}

export const combineDateAndTime = (date: string, time: string) => (date ? `${date}T${time}` : '')
