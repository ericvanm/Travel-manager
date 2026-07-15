const encodeQuery = (query) => encodeURIComponent(String(query || '').trim())

const suggestTransportBookingUrl = (transport) => {
  const mode = (transport.mode || transport.activityType || '').toLowerCase()
  const from = transport.departureLocation || transport.departureAirport || ''
  const to = transport.arrivalLocation || transport.arrivalAirport || ''

  if (mode === 'flight' || transport.activityType === 'flight') {
    const q = [from, to].filter(Boolean).join(' to ')
    return q
      ? `https://www.google.com/travel/flights?q=Flights%20${encodeQuery(q)}`
      : 'https://www.google.com/travel/flights'
  }
  if (mode === 'train') {
    return 'https://www.thetrainline.com'
  }
  if (mode === 'bus') {
    return 'https://www.flixbus.com'
  }
  if (mode === 'car' || transport.activityType === 'car_rental') {
    const loc = to || from
    return loc
      ? `https://www.rentalcars.com/SearchResults.do?city=${encodeQuery(loc)}`
      : 'https://www.rentalcars.com'
  }
  return `https://www.google.com/search?q=${encodeQuery(`${from} ${to} transport booking`)}`
}

const suggestAccommodationBookingUrl = (accommodation, formData) => {
  const name = accommodation.name || accommodation.city || formData?.geographicZone || ''
  return `https://www.booking.com/searchresults.html?ss=${encodeQuery(name)}`
}

const suggestActivityBookingUrl = (activity) => {
  const type = (activity.activityType || '').toLowerCase()
  const label = activity.name || activity.city || ''

  if (type === 'restaurant') {
    return `https://www.google.com/search?q=${encodeQuery(`${label} restaurant reservation`)}`
  }
  if (type === 'museum' || type === 'tour' || type === 'entertainment') {
    return `https://www.getyourguide.com/s/?q=${encodeQuery(label)}`
  }
  if (type === 'hotel') {
    return suggestAccommodationBookingUrl(activity)
  }
  return `https://www.google.com/search?q=${encodeQuery(`${label} book tickets`)}`
}

const suggestBookingUrl = (kind, item, formData = null) => {
  if (item.bookingUrl) return item.bookingUrl
  if (kind === 'transport') return suggestTransportBookingUrl(item)
  if (kind === 'accommodation') return suggestAccommodationBookingUrl(item, formData)
  return suggestActivityBookingUrl(item)
}

module.exports = {
  suggestBookingUrl,
  suggestTransportBookingUrl,
  suggestAccommodationBookingUrl,
  suggestActivityBookingUrl
}
